import type {
  AppNotification,
  Client,
  Contract,
  ContractStatus,
  CreditEntry,
  FinancialSituation,
  Modality,
  Payment,
  PaymentStatus,
  Reservation,
  ReservationStatus,
  Role,
  Room,
} from "../types";
import { monthLabel } from "../data/mock";
import { maskEmail, maskPhone } from "../utils/masks";
import { formatRoomAddress } from "../utils/room-address";

export function mapRole(role?: string): Role {
  return role === "ADMIN" ? "admin" : "client";
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function localISODate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function localISOTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function publicFileUrl(url?: string | null) {
  if (!url) return undefined;
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/uploads/${url}`;
}

export function mapRoom(raw: any): Room {
  const photos = (raw.photos ?? []).map((p: any) => ({
    id: p.id,
    url: p.medium ?? p.original,
  }));
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? undefined,
    type: raw.type ?? "Sala",
    capacity: raw.capacity ?? 2,
    hourlyPrice: Number(raw.hourlyPrice ?? 0),
    amenities: raw.amenities ?? [],
    photo: raw.image?.medium ?? raw.image?.original ?? photos[0]?.url ?? "/images/room-1.jpg",
    photos,
    active: raw.status === "AVAILABLE",
    blocked: raw.status === "MAINTENANCE" || raw.status === "INACTIVE",
    zipCode: raw.zipCode ?? "",
    street: raw.street ?? "",
    number: raw.number ?? "",
    complement: raw.complement ?? "",
    neighborhood: raw.neighborhood ?? "",
    city: raw.city ?? "",
    state: raw.state ?? "",
    address: formatRoomAddress({
      zipCode: raw.zipCode,
      street: raw.street,
      number: raw.number,
      complement: raw.complement,
      neighborhood: raw.neighborhood,
      city: raw.city,
      state: raw.state,
    }),
  };
}

const reservationStatus: Record<string, ReservationStatus> = {
  PENDING: "solicitado",
  CONFIRMED: "confirmado",
  COMPLETED: "concluido",
  CANCELLED: "cancelado",
  NO_SHOW: "nao_compareceu",
  REJECTED: "cancelado",
};

export function mapReservation(raw: any): Reservation {
  const start = new Date(raw.startAt);
  const end = new Date(raw.endAt);
  const hours = raw.duration ? raw.duration / 60 : Math.max(1, Math.round((end.getTime() - start.getTime()) / 3_600_000));
  return {
    id: raw.id,
    clientId: raw.userId,
    clientName: raw.user?.name ?? "Cliente",
    roomId: raw.roomId,
    roomName: raw.room?.name ?? "Sala",
    date: localISODate(start),
    start: localISOTime(start),
    end: localISOTime(end),
    hours,
    status: reservationStatus[raw.status] ?? "confirmado",
    modality: "presencial",
    type: hours > 1 ? "Sessão dupla" : "Sessão individual",
  };
}

const contractStatus: Record<string, ContractStatus> = {
  ACTIVE: "ativo",
  EXPIRING_SOON: "vence_em_breve",
  EXPIRED: "vencido",
  RENEWAL: "renovacao",
};

export function mapContract(raw: any, clientName?: string): Contract {
  return {
    id: raw.id,
    clientId: raw.userId,
    clientName: clientName ?? raw.user?.name ?? "Cliente",
    title: raw.plan?.name ?? `Contrato ${raw.monthlyHours ?? ""}h`,
    status: contractStatus[raw.status] ?? "ativo",
    start: raw.startDate ? localISODate(raw.startDate) : "",
    end: raw.endDate ? localISODate(raw.endDate) : "",
    monthlyHours: raw.monthlyHours ?? 0,
    monthlyValue: Number(raw.monthlyValue ?? raw.plan?.monthlyValue ?? 0),
    cancelLimit: raw.cancellationLimit ?? 0,
    cancelUsed: raw.cancellationsUsed ?? raw.cancellationUsed ?? 0,
    cancelRule: raw.cancellationWindowHours
      ? `Cancelar com ${raw.cancellationWindowHours}h de antecedência`
      : "Conforme contrato",
    financial: "em_dia",
    pdf: publicFileUrl(raw.documentUrl),
  };
}

const invoiceStatus: Record<string, PaymentStatus> = {
  PENDING: "pendente",
  PAID: "pago",
  OVERDUE: "vencido",
  UNDER_REVIEW: "em_analise",
  CANCELLED: "recusado",
};

export function mergeInvoicePayment(invoice: any, payment?: any, clientName?: string): Payment {
  const due = invoice?.dueDate ? localISODate(invoice.dueDate) : "";
  let status: PaymentStatus = invoiceStatus[invoice?.status] ?? "pendente";
  if (payment?.status === "UNDER_REVIEW") status = "em_analise";
  else if (payment?.status === "REJECTED" && invoice?.status !== "PAID") status = "recusado";
  else if (payment?.status === "APPROVED" || invoice?.status === "PAID") status = "pago";

  const paidAt = payment?.paidAt ? localISODate(payment.paidAt) : undefined;
  return {
    id: invoice.id,
    invoiceId: invoice.id,
    paymentId: payment?.id,
    clientId: invoice.userId,
    clientName: clientName ?? invoice.user?.name ?? payment?.user?.name ?? "Cliente",
    competence: invoice.referenceMonth ? monthLabel(`${invoice.referenceMonth}-01`) : monthLabel(due),
    description: invoice.description ?? "Mensalidade",
    value: Number(invoice.amount ?? payment?.amount ?? 0),
    dueDate: due,
    paidAt,
    status,
    method: payment?.method ?? "PIX",
    receipt: publicFileUrl(payment?.receipt?.fileUrl) ?? payment?.receipt?.originalFileName,
    rejectionReason: payment?.receipt?.rejectionReason ?? payment?.rejectionReason,
  };
}

export function mapNotification(raw: any, role: Role): AppNotification {
  const kindMap: Record<string, AppNotification["kind"]> = {
    CONTRACT_EXPIRING: "warning",
    CONTRACT_EXPIRED: "danger",
    PAYMENT_PENDING: "warning",
    PAYMENT_APPROVED: "success",
    PAYMENT_REJECTED: "danger",
    RESERVATION_CONFIRMED: "success",
    RESERVATION_CANCELLED: "info",
    LOW_CREDITS: "warning",
  };
  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    kind: kindMap[raw.type] ?? "info",
    date: raw.createdAt ? localISODate(raw.createdAt) : "",
    read: Boolean(raw.read),
    forRole: role,
  };
}

const modalityMap: Record<string, Modality> = {
  PRESENCIAL: "presencial",
  ONLINE: "online",
  HIBRIDO: "hibrido",
};

const colors = ["#146485", "#2f6b4f", "#8a5a2b", "#5b4d8a", "#8a3d4a"];

export function mapClient(raw: any, contract?: any): Client {
  const profile = raw.professionalProfile ?? {};
  return {
    id: raw.id,
    name: raw.name,
    professionalName: raw.name,
    profession: profile.profession ?? "Profissional",
    registry: profile.registrationNumber ?? "—",
    email: maskEmail(raw.email ?? ""),
    phone: maskPhone(raw.phone ?? ""),
    whatsapp: maskPhone(raw.phone ?? ""),
    document: "",
    birthDate: profile.birthDate ? localISODate(profile.birthDate) : "",
    plan: contract?.plan?.name ?? (contract?.monthlyHours ? `${contract.monthlyHours}h/mês` : "—"),
    monthlyHours: contract?.monthlyHours ?? profile.averageMonthlyHours ?? 0,
    usedHours: 0,
    contractStatus: contract ? contractStatus[contract.status] ?? "ativo" : "vencido",
    status: raw.status === "ACTIVE" ? "ativo" : "inativo",
    modality: modalityMap[profile.serviceType] ?? "presencial",
    specialties: profile.specialties ?? [],
    city: profile.address?.city ?? "",
    joinedAt: raw.createdAt ? localISODate(raw.createdAt) : "",
    color: colors[Math.abs(hash(raw.id)) % colors.length],
  };
}

export function mapCreditEntry(raw: any): CreditEntry {
  const typeMap: Record<string, CreditEntry["type"]> = {
    CREDIT: "credito",
    DEBIT: "reserva",
    REFUND: "cancelamento",
    ADJUSTMENT: Number(raw.amount ?? 0) >= 0 ? "credito" : "reserva",
    EXPIRATION: "reserva",
  };
  const amount = Number(raw.amount ?? 0);
  const delta = raw.type === "DEBIT" ? -Math.abs(amount) : raw.type === "EXPIRATION" ? -Math.abs(amount) : amount;
  return {
    id: raw.id,
    date: raw.createdAt ? localISODate(raw.createdAt) : "",
    type: typeMap[raw.type] ?? "credito",
    description: raw.description ?? raw.type ?? "Movimentação",
    delta,
  };
}

export function financialFromInvoices(payments: Payment[]): FinancialSituation {
  if (payments.some((p) => p.status === "vencido")) return "vencido";
  if (payments.some((p) => p.status === "pendente" || p.status === "em_analise")) return "pendente";
  return "em_dia";
}

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
  return h;
}
