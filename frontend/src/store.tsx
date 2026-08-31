import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, clearTokens, getAccessToken, getRefreshToken, setTokens } from "./api/client";
import {
  financialFromInvoices,
  mapClient,
  mapContract,
  mapCreditEntry,
  mapNotification,
  mapReservation,
  mapRole,
  mapRoom,
  mergeInvoicePayment,
} from "./api/mappers";
import { buildUsageByMonth, offsetISO, toISO, type RoomAvailability } from "./data/mock";
import type {
  AppNotification,
  Client,
  Contract,
  CreditEntry,
  MeUser,
  Payment,
  Reservation,
  Role,
  Room,
} from "./types";

export type Page = { name: string; param?: string };

export interface Toast {
  id: number;
  title: string;
  body?: string;
  kind: "success" | "info" | "warning" | "danger";
}

interface Ctx {
  role: Role | null;
  booting: boolean;
  me: MeUser | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  page: Page;
  navigate: (name: string, param?: string) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  refresh: () => Promise<void>;

  currentClientId: string;
  rooms: Room[];
  clients: Client[];
  availabilities: RoomAvailability[];
  reservations: Reservation[];
  payments: Payment[];
  contracts: Contract[];
  creditEntries: CreditEntry[];
  notifications: AppNotification[];
  credits: { contracted: number; used: number; available: number; walletId?: string };
  usageByMonth: ReturnType<typeof buildUsageByMonth>;

  addReservation: (input: { roomId: string; roomName: string; date: string; hour: string; hours: number }) => Promise<void>;
  cancelReservation: (id: string, late: boolean) => Promise<void>;
  setReservationStatus: (id: string, status: Reservation["status"]) => Promise<void>;
  submitReceipt: (invoiceId: string, file: File, note?: string) => Promise<void>;
  approvePayment: (id: string) => Promise<void>;
  rejectPayment: (id: string, reason: string) => Promise<void>;
  toggleContract: (id: string) => Promise<void>;
  createContract: (input: {
    userId: string;
    start: string;
    end: string;
    monthlyHours: number;
    cancellationLimit: number;
    cancellationWindowHours?: number;
  }) => Promise<void>;
  toggleRoom: (id: string) => Promise<void>;
  updateProfile: (input: { name?: string; phone?: string; profession?: string; registrationNumber?: string; specialties?: string[]; serviceType?: string; birthDate?: string }) => Promise<void>;
  createClient: (input: { name: string; email: string; phone?: string; password: string }) => Promise<string>;

  unreadCount: number;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  pushNotification: (n: Omit<AppNotification, "id" | "date" | "read">) => void;

  toasts: Toast[];
  toast: (title: string, body?: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
}

const AppCtx = createContext<Ctx | null>(null);

let toastSeq = 1;

function failMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [booting, setBooting] = useState(true);
  const [me, setMe] = useState<MeUser | null>(null);
  const [page, setPage] = useState<Page>({ name: "dashboard" });
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [availabilities, setAvailabilities] = useState<RoomAvailability[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [creditEntries, setCreditEntries] = useState<CreditEntry[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [credits, setCredits] = useState({ contracted: 0, used: 0, available: 0, walletId: undefined as string | undefined });
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toast = useCallback((title: string, body?: string, kind: Toast["kind"] = "success") => {
    const id = toastSeq++;
    setToasts((t) => [...t, { id, title, body, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const pushNotification = useCallback((n: Omit<AppNotification, "id" | "date" | "read">) => {
    setNotifications((prev) => [
      { ...n, id: `local-${Date.now()}`, date: toISO(new Date()), read: false },
      ...prev,
    ]);
  }, []);

  const hydrate = useCallback(async () => {
    const profile = await api<any>("/users/me");
    const mappedRole = mapRole(profile.role);
    const meUser: MeUser = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? "",
      role: mappedRole,
      profession: profile.professionalProfile?.profession ?? (mappedRole === "admin" ? "Administrador" : "Profissional"),
    };
    setMe(meUser);
    setRole(mappedRole);

    const [roomRows, reservationRows, contractRows, invoiceRows, paymentRows, notificationRows] = await Promise.all([
      api<any[]>("/rooms?limit=100"),
      api<any[]>("/reservations?limit=100"),
      api<any[]>("/contracts?limit=100"),
      api<any[]>("/invoices?limit=100").catch(() => []),
      api<any[]>("/payments?limit=100").catch(() => []),
      api<any[]>("/notifications?limit=100").catch(() => []),
    ]);

    const mappedRooms = (roomRows ?? []).map(mapRoom);
    const availabilityRows = (
      await Promise.all(
        mappedRooms.map((room) =>
          api<any[]>(`/schedules/rooms/${room.id}/availabilities`).catch(() => []),
        ),
      )
    ).flat();
    setAvailabilities(
      availabilityRows
        .filter((a: any) => a.active !== false)
        .map((a: any) => ({
          roomId: a.roomId,
          weekday: a.weekday,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
    );
    const mappedReservations = (reservationRows ?? []).map(mapReservation);
    let mappedClients: Client[] = [];

    if (mappedRole === "admin") {
      const userRows = await api<any[]>("/users?role=CLIENT&limit=100").catch(() => []);
      mappedClients = (userRows ?? []).map((u) => {
        const contract = (contractRows ?? []).find((c: any) => c.userId === u.id);
        const client = mapClient(u, contract);
        client.usedHours = mappedReservations
          .filter((r) => r.clientId === u.id && r.status !== "cancelado")
          .reduce((s, r) => s + r.hours, 0);
        return client;
      });
    } else {
      const contract = (contractRows ?? []).find((c: any) => c.userId === profile.id);
      const self = mapClient(profile, contract);
      self.usedHours = mappedReservations
        .filter((r) => r.clientId === profile.id && r.status !== "cancelado")
        .reduce((s, r) => s + r.hours, 0);
      mappedClients = [self];
    }

    const names = Object.fromEntries(mappedClients.map((c) => [c.id, c.name]));
    const mappedContracts = (contractRows ?? []).map((c: any) => {
      const mapped = mapContract(c, names[c.userId]);
      const related = (invoiceRows ?? []).filter((i: any) => i.userId === c.userId);
      mapped.financial = financialFromInvoices(
        related.map((i: any) => mergeInvoicePayment(i, (paymentRows ?? []).find((p: any) => p.invoiceId === i.id))),
      );
      return mapped;
    });

    const mappedPayments = (invoiceRows ?? []).map((invoice: any) => {
      const related = (paymentRows ?? [])
        .filter((p: any) => p.invoiceId === invoice.id)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return mergeInvoicePayment(invoice, related[0], names[invoice.userId]);
    });

    setRooms(mappedRooms);
    setReservations(mappedReservations);
    setClients(mappedClients);
    setContracts(mappedContracts);
    setPayments(mappedPayments);
    setNotifications((notificationRows ?? []).map((n: any) => mapNotification(n, mappedRole)));
    setMe((prev) => (prev ? { ...prev, plan: mappedContracts[0]?.title } : prev));

    try {
      const wallet = await api<any>("/credits/me");
      setCredits({
        contracted: wallet.totalGranted ?? mappedContracts[0]?.monthlyHours ?? 0,
        used: wallet.totalUsed ?? 0,
        available: wallet.balance ?? 0,
        walletId: wallet.id,
      });
      if (wallet.id) {
        const txs = await api<any[]>(`/credits/wallets/${wallet.id}/transactions?limit=50`).catch(() => []);
        setCreditEntries((txs ?? []).map(mapCreditEntry));
      }
    } catch {
      const contracted = mappedContracts[0]?.monthlyHours ?? 0;
      const used = mappedReservations.filter((r) => r.status !== "cancelado").reduce((s, r) => s + r.hours, 0);
      setCredits({ contracted, used, available: Math.max(contracted - used, 0) });
      setCreditEntries([]);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      setBooting(false);
      return;
    }
    hydrate()
      .catch(() => {
        clearTokens();
        setRole(null);
        setMe(null);
      })
      .finally(() => setBooting(false));
  }, [hydrate]);

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      const tokens = await api<{ accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setTokens(tokens.accessToken, tokens.refreshToken, remember);
      await hydrate();
      setPage({ name: "dashboard" });
    },
    [hydrate],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    clearTokens();
    setRole(null);
    setMe(null);
    setRooms([]);
    setClients([]);
    setReservations([]);
    setPayments([]);
    setContracts([]);
    setCreditEntries([]);
    setNotifications([]);
    setCredits({ contracted: 0, used: 0, available: 0 });
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await api("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const navigate = (name: string, param?: string) => {
    setPage({ name, param });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const addReservation: Ctx["addReservation"] = async ({ roomId, date, hour, hours }) => {
    try {
      await api("/reservations", {
        method: "POST",
        body: JSON.stringify({
          roomId,
          startAt: new Date(`${date}T${hour}:00`).toISOString(),
          duration: hours * 60,
        }),
      });
      await hydrate();
      toast("Reserva confirmada!", `${hours}h de crédito utilizadas. Saldo atualizado.`, "success");
    } catch (error) {
      toast("Não foi possível reservar", failMessage(error, "Tente outro horário."), "danger");
      throw error;
    }
  };

  const cancelReservation: Ctx["cancelReservation"] = async (id) => {
    try {
      await api(`/reservations/${id}/cancel`, { method: "PATCH", body: JSON.stringify({}) });
      await hydrate();
      toast("Reserva cancelada", "O status e os créditos foram atualizados.", "success");
    } catch (error) {
      toast("Não foi possível cancelar", failMessage(error, "Tente novamente."), "danger");
    }
  };

  const setReservationStatus: Ctx["setReservationStatus"] = async (id, status) => {
    try {
      if (status === "concluido") await api(`/reservations/${id}/complete`, { method: "PATCH" });
      else if (status === "nao_compareceu") await api(`/reservations/${id}/no-show`, { method: "PATCH" });
      else {
        toast("Status não suportado", "Este status não pode ser alterado por aqui.", "warning");
        return;
      }
      await hydrate();
      toast("Status atualizado", `Reserva marcada como ${status}.`, "info");
    } catch (error) {
      toast("Não foi possível atualizar", failMessage(error, "Tente novamente."), "danger");
    }
  };

  const submitReceipt: Ctx["submitReceipt"] = async (invoiceId, file) => {
    try {
      const current = payments.find((p) => p.id === invoiceId);
      let paymentId = current?.paymentId;
      if (!paymentId) {
        const created = await api<{ id: string }>("/payments", {
          method: "POST",
          body: JSON.stringify({ invoiceId, method: "PIX" }),
        });
        paymentId = created.id;
      }
      const body = new FormData();
      body.append("file", file);
      await api(`/payments/${paymentId}/receipt`, { method: "POST", body });
      await hydrate();
      toast("Comprovante enviado", "Ele será analisado pela administração.", "success");
    } catch (error) {
      toast("Não foi possível enviar", failMessage(error, "Verifique o arquivo e tente novamente."), "danger");
      throw error;
    }
  };

  const approvePayment: Ctx["approvePayment"] = async (id) => {
    try {
      const current = payments.find((p) => p.id === id);
      if (!current?.paymentId) {
        toast("Sem pagamento", "Ainda não há comprovante para aprovar.", "warning");
        return;
      }
      await api(`/payments/${current.paymentId}/approve`, { method: "PATCH" });
      await hydrate();
      toast("Pagamento aprovado", "A cobrança foi marcada como paga.", "success");
    } catch (error) {
      toast("Não foi possível aprovar", failMessage(error, "Tente novamente."), "danger");
    }
  };

  const rejectPayment: Ctx["rejectPayment"] = async (id, reason) => {
    try {
      const current = payments.find((p) => p.id === id);
      if (!current?.paymentId) {
        toast("Sem pagamento", "Ainda não há comprovante para recusar.", "warning");
        return;
      }
      await api(`/payments/${current.paymentId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      await hydrate();
      toast("Comprovante recusado", "O cliente foi notificado com o motivo.", "warning");
    } catch (error) {
      toast("Não foi possível recusar", failMessage(error, "Tente novamente."), "danger");
    }
  };

  const toggleContract: Ctx["toggleContract"] = async (id) => {
    try {
      const current = contracts.find((c) => c.id === id);
      await api(`/contracts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: current?.status === "ativo" ? "EXPIRED" : "ACTIVE" }),
      });
      await hydrate();
      toast("Contrato atualizado", "Status do contrato alterado.", "info");
    } catch (error) {
      toast("Não foi possível atualizar", failMessage(error, "Tente novamente."), "danger");
    }
  };

  const createContract: Ctx["createContract"] = async (input) => {
    try {
      await api("/contracts", {
        method: "POST",
        body: JSON.stringify({
          userId: input.userId,
          startDate: new Date(`${input.start}T00:00:00`).toISOString(),
          endDate: new Date(`${input.end}T00:00:00`).toISOString(),
          monthlyHours: input.monthlyHours,
          cancellationLimit: input.cancellationLimit,
          cancellationWindowHours: input.cancellationWindowHours ?? 24,
        }),
      });
      await hydrate();
      toast("Contrato criado", "O contrato foi salvo e o cliente notificado.", "success");
    } catch (error) {
      toast("Não foi possível criar", failMessage(error, "Confira os dados e tente novamente."), "danger");
      throw error;
    }
  };

  const toggleRoom: Ctx["toggleRoom"] = async (id) => {
    try {
      const room = rooms.find((r) => r.id === id);
      await api(`/rooms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: room?.blocked ? "AVAILABLE" : "MAINTENANCE" }),
      });
      await hydrate();
      toast("Sala atualizada", "Status de bloqueio alterado com sucesso.", "success");
    } catch (error) {
      toast("Não foi possível atualizar a sala", failMessage(error, "Tente novamente."), "danger");
    }
  };

  const updateProfile: Ctx["updateProfile"] = async (input) => {
    try {
      if (input.name || input.phone) {
        await api("/users/me", {
          method: "PATCH",
          body: JSON.stringify({ name: input.name, phone: input.phone }),
        });
      }
      if (input.profession || input.registrationNumber || input.specialties || input.serviceType || input.birthDate) {
        await api("/users/me/professional-profile", {
          method: "PUT",
          body: JSON.stringify({
            profession: input.profession,
            registrationNumber: input.registrationNumber,
            specialties: input.specialties,
            serviceType: input.serviceType,
            birthDate: input.birthDate ? new Date(input.birthDate).toISOString() : undefined,
          }),
        });
      }
      await hydrate();
      toast("Perfil atualizado", "Seus dados foram salvos.", "success");
    } catch (error) {
      toast("Não foi possível salvar", failMessage(error, "Tente novamente."), "danger");
      throw error;
    }
  };

  const createClient: Ctx["createClient"] = async (input) => {
    try {
      const user = await api<{ id: string }>("/users", {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          phone: input.phone || undefined,
          role: "CLIENT",
          password: input.password,
        }),
      });
      await hydrate();
      toast("Cliente cadastrado", "A conta foi criada com sucesso.", "success");
      return user.id;
    } catch (error) {
      toast("Não foi possível cadastrar", failMessage(error, "Confira os dados e tente novamente."), "danger");
      throw error;
    }
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAllRead = async () => {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    } catch (error) {
      toast("Não foi possível marcar como lidas", failMessage(error, "Tente novamente."), "danger");
    }
  };

  const markRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
    } catch {
      setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
    }
  };

  const usageByMonth = useMemo(
    () => buildUsageByMonth(reservations, credits.contracted || contracts[0]?.monthlyHours || 0),
    [reservations, credits.contracted, contracts],
  );

  const value: Ctx = {
    role,
    booting,
    me,
    login,
    logout,
    requestPasswordReset,
    page,
    navigate,
    theme,
    toggleTheme,
    refresh: hydrate,
    currentClientId: me?.id ?? "",
    rooms,
    clients,
    availabilities,
    reservations,
    payments,
    contracts,
    creditEntries,
    notifications,
    credits,
    usageByMonth,
    addReservation,
    cancelReservation,
    setReservationStatus,
    submitReceipt,
    approvePayment,
    rejectPayment,
    toggleContract,
    createContract,
    toggleRoom,
    updateProfile,
    createClient,
    unreadCount,
    markAllRead,
    markRead,
    pushNotification,
    toasts,
    toast,
    dismissToast,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export const nextMonthDue = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(10);
  return toISO(d);
};

export const addDays = (n: number) => offsetISO(n);
