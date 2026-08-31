import type {
  AppNotification,
  Client,
  Contract,
  CreditEntry,
  Payment,
  Reservation,
  Room,
} from "../types";

/* ------------------------------------------------------------------ */
/* date helpers                                                        */
/* ------------------------------------------------------------------ */

export const today = new Date();

export function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function offsetISO(days: number, from: Date = today) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function fromISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(iso: string) {
  return fromISO(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtShort(iso: string) {
  return fromISO(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function fmtDayMonth(iso: string) {
  return fromISO(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function monthLabel(iso: string) {
  const d = fromISO(iso);
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthShort(iso: string) {
  return fromISO(iso).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

export function weekdayShort(iso: string) {
  return fromISO(iso).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

export function daysBetween(a: string, b: string) {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
}

export function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // monday start
  const cells: { iso: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ iso: toISO(d), inMonth: d.getMonth() === month });
  }
  return cells;
}

export function weekOf(iso: string) {
  const d = fromISO(iso);
  const start = new Date(d);
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return toISO(x);
  });
}

export function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ------------------------------------------------------------------ */
/* rooms                                                               */
/* ------------------------------------------------------------------ */

export const rooms: Room[] = [
  {
    id: "r1",
    name: "Sala 01 — Consultório",
    type: "Consultório individual",
    capacity: 2,
    amenities: ["Ar-condicionado", "Wi-Fi", "Mesa", "Poltronas", "Isolamento acústico", "Ambiente climatizado"],
    photo: "/images/room-1.jpg",
    active: true,
  },
  {
    id: "r2",
    name: "Sala 02 — Consultório",
    type: "Consultório individual",
    capacity: 2,
    amenities: ["Ar-condicionado", "Wi-Fi", "Mesa", "Poltronas", "Isolamento acústico", "Iluminação natural"],
    photo: "/images/room-2.jpg",
    active: true,
  },
  {
    id: "r3",
    name: "Sala 03 — Consultório",
    type: "Consultório premium",
    capacity: 2,
    amenities: ["Ar-condicionado", "Wi-Fi", "Mesa", "Poltronas", "Isolamento acústico", "Ambiente climatizado"],
    photo: "/images/room-3.jpg",
    active: true,
  },
  {
    id: "r4",
    name: "Sala 04 — Terapia em grupo",
    type: "Sala de grupo",
    capacity: 8,
    amenities: ["Ar-condicionado", "Wi-Fi", "Projetor", "Cadeiras", "Quadro branco", "Isolamento acústico"],
    photo: "/images/room-2.jpg",
    active: true,
  },
  {
    id: "r5",
    name: "Sala 05 — Psicopedagogia",
    type: "Sala multiuso",
    capacity: 4,
    amenities: ["Ar-condicionado", "Wi-Fi", "Mesa infantil", "Materiais didáticos", "Iluminação natural"],
    photo: "/images/room-1.jpg",
    active: true,
  },
  {
    id: "r6",
    name: "Sala 06 — Online",
    type: "Estúdio para atendimento remoto",
    capacity: 1,
    amenities: ["Cabine acústica", "Wi-Fi dedicado", "Iluminação de vídeo", "Fundo neutro", "Webcam Full HD"],
    photo: "/images/room-3.jpg",
    active: true,
    blocked: true,
  },
];

/* ------------------------------------------------------------------ */
/* clients                                                             */
/* ------------------------------------------------------------------ */

export const clients: Client[] = [
  {
    id: "c1",
    name: "Maria Silva",
    professionalName: "Dra. Maria Silva",
    profession: "Psicóloga clínica",
    registry: "CRP 06/128945",
    email: "maria.silva@email.com",
    phone: "(11) 98877-6655",
    whatsapp: "(11) 98877-6655",
    document: "345.812.900-71",
    birthDate: "1989-04-12",
    plan: "Plano 30h",
    monthlyHours: 30,
    usedHours: 12,
    contractStatus: "ativo",
    status: "ativo",
    modality: "hibrido",
    specialties: ["Terapia cognitivo-comportamental", "Ansiedade", "Atendimento adulto"],
    city: "São Paulo/SP",
    joinedAt: offsetISO(-420),
    color: "#1c7fa3",
  },
  {
    id: "c2",
    name: "João Costa",
    professionalName: "Dr. João Costa",
    profession: "Dentista",
    registry: "CRO-SP 45678",
    email: "joao.costa@email.com",
    phone: "(11) 97766-5544",
    whatsapp: "(11) 97766-5544",
    document: "233.451.780-02",
    birthDate: "1985-09-02",
    plan: "Plano 20h",
    monthlyHours: 20,
    usedHours: 14,
    contractStatus: "vence_em_breve",
    status: "ativo",
    modality: "presencial",
    specialties: ["Odontologia geral", "Atendimento adulto"],
    city: "São Paulo/SP",
    joinedAt: offsetISO(-300),
    color: "#7c6cf0",
  },
  {
    id: "c3",
    name: "Ana Souza",
    professionalName: "Dra. Ana Souza",
    profession: "Nutricionista",
    registry: "CRN-3 12345",
    email: "ana.souza@email.com",
    phone: "(11) 96655-4433",
    whatsapp: "(11) 96655-4433",
    document: "119.887.340-55",
    birthDate: "1992-01-25",
    plan: "Plano 15h",
    monthlyHours: 15,
    usedHours: 11,
    contractStatus: "vencido",
    status: "ativo",
    modality: "presencial",
    specialties: ["Nutrição clínica", "Crianças e adolescentes"],
    city: "Santo André/SP",
    joinedAt: offsetISO(-210),
    color: "#e0803c",
  },
  {
    id: "c4",
    name: "Carlos Lima",
    professionalName: "Dr. Carlos Lima",
    profession: "Terapeuta ocupacional",
    registry: "CRP 06/134551",
    email: "carlos.lima@email.com",
    phone: "(11) 95544-3322",
    whatsapp: "(11) 95544-3322",
    document: "451.223.880-19",
    birthDate: "1980-07-30",
    plan: "Plano 40h",
    monthlyHours: 40,
    usedHours: 36,
    contractStatus: "renovacao",
    status: "ativo",
    modality: "hibrido",
    specialties: ["Terapia ocupacional", "Reabilitação"],
    city: "São Bernardo/SP",
    joinedAt: offsetISO(-520),
    color: "#2fa37c",
  },
  {
    id: "c5",
    name: "Beatriz Nunes",
    professionalName: "Dra. Beatriz Nunes",
    profession: "Psicóloga",
    registry: "CRP 06/142009",
    email: "beatriz.nunes@email.com",
    phone: "(11) 94433-2211",
    whatsapp: "(11) 94433-2211",
    document: "287.334.110-88",
    birthDate: "1994-11-08",
    plan: "Plano 10h",
    monthlyHours: 10,
    usedHours: 3,
    contractStatus: "ativo",
    status: "inativo",
    modality: "online",
    specialties: ["Terapia breve", "Atendimento online"],
    city: "Campinas/SP",
    joinedAt: offsetISO(-90),
    color: "#d4557f",
  },
];

export const CURRENT_CLIENT_ID = "c1";

export const adminUser = {
  name: "Ricardo Almeida",
  role: "Proprietário / Gestor",
  email: "ricardo@espacovital.com.br",
  initials: "RA",
};

/* ------------------------------------------------------------------ */
/* contracts                                                           */
/* ------------------------------------------------------------------ */

const mStart = new Date(today.getFullYear(), today.getMonth(), 1);
const mEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
const nextEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);

export const contracts: Contract[] = [
  {
    id: "ct1",
    clientId: "c1",
    clientName: "Maria Silva",
    title: "Contrato de utilização de sala — Plano 30h",
    status: "ativo",
    start: toISO(mStart),
    end: toISO(mEnd),
    monthlyHours: 30,
    monthlyValue: 900,
    cancelLimit: 3,
    cancelUsed: 2,
    cancelRule: "Cancelamentos com mais de 24h devolvem o crédito integralmente.",
    financial: "em_dia",
    pdf: "contrato-maria-silva-plano30h.pdf",
  },
  {
    id: "ct2",
    clientId: "c2",
    clientName: "João Costa",
    title: "Contrato de utilização de sala — Plano 20h",
    status: "vence_em_breve",
    start: offsetISO(-335),
    end: offsetISO(7),
    monthlyHours: 20,
    monthlyValue: 750,
    cancelLimit: 2,
    cancelUsed: 1,
    cancelRule: "Cancelamentos com mais de 24h devolvem o crédito integralmente.",
    financial: "pendente",
    pdf: "contrato-joao-costa-plano20h.pdf",
  },
  {
    id: "ct3",
    clientId: "c3",
    clientName: "Ana Souza",
    title: "Contrato de utilização de sala — Plano 15h",
    status: "vencido",
    start: offsetISO(-220),
    end: offsetISO(-6),
    monthlyHours: 15,
    monthlyValue: 620,
    cancelLimit: 2,
    cancelUsed: 2,
    cancelRule: "Cancelamentos com mais de 24h devolvem o crédito integralmente.",
    financial: "vencido",
    pdf: "contrato-ana-souza-plano15h.pdf",
  },
  {
    id: "ct4",
    clientId: "c4",
    clientName: "Carlos Lima",
    title: "Contrato de utilização de sala — Plano 40h",
    status: "renovacao",
    start: offsetISO(-40),
    end: toISO(nextEnd),
    monthlyHours: 40,
    monthlyValue: 1180,
    cancelLimit: 4,
    cancelUsed: 1,
    cancelRule: "Cancelamentos com mais de 24h devolvem o crédito integralmente.",
    financial: "em_dia",
    pdf: "contrato-carlos-lima-plano40h.pdf",
  },
  {
    id: "ct5",
    clientId: "c5",
    clientName: "Beatriz Nunes",
    title: "Contrato de utilização de sala — Plano 10h",
    status: "ativo",
    start: toISO(mStart),
    end: toISO(mEnd),
    monthlyHours: 10,
    monthlyValue: 420,
    cancelLimit: 1,
    cancelUsed: 0,
    cancelRule: "Cancelamentos com mais de 24h devolvem o crédito integralmente.",
    financial: "pendente",
    pdf: "contrato-beatriz-nunes-plano10h.pdf",
  },
  {
    id: "ct6",
    clientId: "c1",
    clientName: "Maria Silva",
    title: "Aditivo — Pacote extra de 10h",
    status: "renovacao",
    start: toISO(mStart),
    end: toISO(nextEnd),
    monthlyHours: 10,
    monthlyValue: 300,
    cancelLimit: 1,
    cancelUsed: 0,
    cancelRule: "Créditos extras não acumulam para o mês seguinte.",
    financial: "em_dia",
  },
  {
    id: "ct7",
    clientId: "c2",
    clientName: "João Costa",
    title: "Contrato anterior — Plano 12h",
    status: "vencido",
    start: offsetISO(-700),
    end: offsetISO(-370),
    monthlyHours: 12,
    monthlyValue: 480,
    cancelLimit: 2,
    cancelUsed: 0,
    cancelRule: "Contrato encerrado.",
    financial: "em_dia",
  },
  {
    id: "ct8",
    clientId: "c4",
    clientName: "Carlos Lima",
    title: "Contrato de utilização de sala — Plano 30h",
    status: "ativo",
    start: toISO(mStart),
    end: toISO(mEnd),
    monthlyHours: 30,
    monthlyValue: 980,
    cancelLimit: 3,
    cancelUsed: 0,
    cancelRule: "Cancelamentos com mais de 24h devolvem o crédito integralmente.",
    financial: "em_dia",
  },
  {
    id: "ct9",
    clientId: "c3",
    clientName: "Ana Souza",
    title: "Contrato de utilização de sala — Plano 8h",
    status: "vence_em_breve",
    start: offsetISO(-100),
    end: offsetISO(12),
    monthlyHours: 8,
    monthlyValue: 390,
    cancelLimit: 1,
    cancelUsed: 0,
    cancelRule: "Cancelamentos com mais de 24h devolvem o crédito integralmente.",
    financial: "pendente",
  },
  {
    id: "ct10",
    clientId: "c5",
    clientName: "Beatriz Nunes",
    title: "Contrato experimental — Plano 5h",
    status: "vencido",
    start: offsetISO(-150),
    end: offsetISO(-60),
    monthlyHours: 5,
    monthlyValue: 220,
    cancelLimit: 1,
    cancelUsed: 1,
    cancelRule: "Contrato experimental de 60 dias.",
    financial: "vencido",
  },
];

/* ------------------------------------------------------------------ */
/* reservations                                                        */
/* ------------------------------------------------------------------ */

const raw: [string, string, number, string, number, Reservation["status"]][] = [
  // clientId, roomId, dayOffset, start, hours, status
  ["c1", "r3", 0, "14:00", 1, "confirmado"],
  ["c1", "r3", 0, "16:00", 1, "confirmado"],
  ["c1", "r1", 1, "09:00", 2, "confirmado"],
  ["c1", "r2", 3, "10:00", 1, "solicitado"],
  ["c1", "r3", 4, "15:00", 1, "confirmado"],
  ["c1", "r1", -2, "11:00", 1, "concluido"],
  ["c1", "r2", -3, "09:00", 2, "concluido"],
  ["c1", "r3", -5, "14:00", 1, "concluido"],
  ["c1", "r1", -7, "16:00", 1, "cancelado"],
  ["c1", "r3", -9, "10:00", 1, "nao_compareceu"],
  ["c1", "r2", -12, "13:00", 2, "concluido"],
  ["c1", "r1", -16, "08:00", 1, "concluido"],
  ["c1", "r3", -18, "17:00", 1, "concluido"],
  ["c2", "r1", 0, "09:00", 2, "confirmado"],
  ["c2", "r1", 1, "14:00", 1, "confirmado"],
  ["c2", "r2", 2, "11:00", 1, "solicitado"],
  ["c2", "r3", -1, "15:00", 1, "concluido"],
  ["c2", "r2", -4, "10:00", 1, "cancelado"],
  ["c3", "r5", 0, "10:00", 2, "confirmado"],
  ["c3", "r5", 2, "09:00", 1, "confirmado"],
  ["c3", "r4", -2, "14:00", 2, "concluido"],
  ["c3", "r5", -6, "08:00", 1, "nao_compareceu"],
  ["c4", "r4", 0, "08:00", 2, "confirmado"],
  ["c4", "r2", 1, "13:00", 1, "confirmado"],
  ["c4", "r1", 3, "17:00", 2, "solicitado"],
  ["c4", "r4", -3, "09:00", 2, "concluido"],
  ["c4", "r3", -8, "11:00", 1, "concluido"],
  ["c5", "r6", 1, "19:00", 1, "confirmado"],
  ["c5", "r6", -5, "19:00", 1, "concluido"],
  ["c5", "r2", -11, "16:00", 1, "cancelado"],
];

export const reservations: Reservation[] = raw.map(
  ([clientId, roomId, off, start, hours, status], i) => {
    const client = clients.find((c) => c.id === clientId)!;
    const room = rooms.find((r) => r.id === roomId)!;
    const endH = Number(start.slice(0, 2)) + hours;
    return {
      id: `res${i + 1}`,
      clientId,
      clientName: client.name,
      roomId,
      roomName: room.name,
      date: offsetISO(off),
      start,
      end: `${String(endH).padStart(2, "0")}:00`,
      hours,
      status,
      modality: client.modality,
      type: hours > 1 ? "Sessão dupla" : "Sessão individual",
    };
  },
);

export const HOURS = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

export type Slot = {
  hour: string;
  status: "disponivel" | "solicitado" | "confirmado" | "utilizado" | "cancelado" | "indisponivel";
  reservation?: Reservation;
};

export type RoomAvailability = {
  roomId: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

function timeToMin(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function getDaySlots(
  roomId: string,
  iso: string,
  all: Reservation[],
  roomList: Room[] = rooms,
  availabilities: RoomAvailability[] = [],
): Slot[] {
  const room = roomList.find((r) => r.id === roomId);
  const weekday = fromISO(iso).getDay();
  const rules = availabilities.filter((a) => a.roomId === roomId && a.weekday === weekday);
  const hasRules = availabilities.some((a) => a.roomId === roomId);
  return HOURS.map((hour) => {
    const res = all.find(
      (r) =>
        r.roomId === roomId &&
        r.date === iso &&
        r.status !== "cancelado" &&
        Number(r.start.slice(0, 2)) <= Number(hour.slice(0, 2)) &&
        Number(hour.slice(0, 2)) < Number(r.end.slice(0, 2)),
    );
    if (res) {
      const map: Record<Reservation["status"], Slot["status"]> = {
        solicitado: "solicitado",
        confirmado: "confirmado",
        concluido: "utilizado",
        cancelado: "cancelado",
        nao_compareceu: "cancelado",
      };
      return { hour, status: map[res.status], reservation: res };
    }
    if (room?.blocked) return { hour, status: "indisponivel" };
    if (hasRules) {
      const mins = timeToMin(hour);
      const open = rules.some((r) => timeToMin(r.startTime) <= mins && mins < timeToMin(r.endTime));
      if (!open) return { hour, status: "indisponivel" };
    }
    return { hour, status: "disponivel" };
  });
}

export function buildUsageByMonth(all: Reservation[], contracted: number) {
  const todayISO = toISO(new Date());
  return [5, 4, 3, 2, 1, 0].map((back) => {
    const d = new Date();
    d.setMonth(d.getMonth() - back, 1);
    const iso = toISO(d);
    const ym = iso.slice(0, 7);
    const monthRes = all.filter((r) => r.date.startsWith(ym) && r.status !== "cancelado");
    const utilizadas = monthRes
      .filter((r) => r.status === "concluido" || r.status === "nao_compareceu" || r.date < todayISO)
      .reduce((s, r) => s + r.hours, 0);
    const reservadas = monthRes
      .filter((r) => ["confirmado", "solicitado"].includes(r.status) && r.date >= todayISO)
      .reduce((s, r) => s + r.hours, 0);
    return {
      iso,
      label: monthShort(iso),
      contratadas: contracted,
      utilizadas,
      reservadas,
      disponiveis: Math.max(contracted - utilizadas - reservadas, 0),
    };
  });
}

/* ------------------------------------------------------------------ */
/* payments                                                            */
/* ------------------------------------------------------------------ */

function competenceDate(monthsAgo: number, day = 10) {
  const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, day);
  return toISO(d);
}

function paymentId(n: number) {
  return `pay${n}`;
}

const paymentRows: [string, number, number, string, string, Payment["status"], string?, string?][] = [
  // clientId, monthsAgo, value, competenceDate, paidAtOffset, status, receipt, rejection
  ["c1", 0, 900, "10", "", "pendente"],
  ["c1", 1, 900, "10", "09", "pago"],
  ["c1", 2, 900, "10", "10", "pago"],
  ["c1", 3, 900, "10", "08", "pago"],
  ["c1", 4, 900, "10", "10", "pago"],
  ["c2", 0, 750, "10", "", "em_analise", "comprovante-joao-set.pdf"],
  ["c2", 1, 750, "10", "09", "pago"],
  ["c2", 2, 750, "10", "", "vencido"],
  ["c3", 0, 620, "10", "", "vencido"],
  ["c3", 1, 620, "10", "", "recusado", "comprovante-ana.pdf", "Não foi possível validar o comprovante enviado. Envie um novo comprovante."],
  ["c3", 2, 620, "10", "10", "pago"],
  ["c4", 0, 1180, "10", "", "em_analise", "comprovante-carlos.pdf"],
  ["c4", 1, 1180, "10", "09", "pago"],
  ["c5", 0, 420, "10", "", "em_analise", "comprovante-bia.pdf"],
  ["c5", 1, 420, "10", "11", "pago"],
  ["c5", 2, 420, "10", "", "vencido"],
];

export const payments: Payment[] = paymentRows.map((row, i) => {
  const [clientId, monthsAgo, value, day, paidDay, status, receipt, rejection] = row;
  const client = clients.find((c) => c.id === clientId)!;
  const due = competenceDate(monthsAgo, Number(day));
  const base = fromISO(due);
  const paid = paidDay ? toISO(new Date(base.getFullYear(), base.getMonth(), Number(paidDay))) : undefined;
  return {
    id: paymentId(i + 1),
    clientId,
    clientName: client.name,
    competence: monthLabel(due),
    description: "Plano mensal de utilização das salas",
    value,
    dueDate: due,
    paidAt: paid,
    status,
    method: "Pix",
    receipt,
    rejectionReason: rejection,
  };
});

/* ------------------------------------------------------------------ */
/* credits                                                             */
/* ------------------------------------------------------------------ */

export const creditEntries: CreditEntry[] = [
  { id: "cd1", date: offsetISO(0), type: "reserva", description: "Reserva confirmada", room: "Sala 03", delta: -1 },
  { id: "cd2", date: offsetISO(-2), type: "reserva", description: "Reserva confirmada", room: "Sala 02", delta: -2 },
  { id: "cd3", date: offsetISO(-5), type: "cancelamento", description: "Cancelamento com +24h", room: "Sala 03", delta: 1 },
  { id: "cd4", date: offsetISO(-7), type: "reserva", description: "Reserva confirmada", room: "Sala 01", delta: -1 },
  { id: "cd5", date: offsetISO(-9), type: "reserva", description: "Não compareceu", room: "Sala 03", delta: -1 },
  { id: "cd6", date: offsetISO(-12), type: "reserva", description: "Reserva confirmada", room: "Sala 02", delta: -2 },
  { id: "cd7", date: offsetISO(-16), type: "reserva", description: "Reserva confirmada", room: "Sala 01", delta: -1 },
  { id: "cd8", date: offsetISO(-18), type: "reserva", description: "Reserva confirmada", room: "Sala 03", delta: -1 },
  { id: "cd9", date: offsetISO(-30), type: "credito", description: "Créditos do plano — ciclo mensal", delta: 30 },
];

export const usageByMonth = [5, 4, 3, 2, 1, 0].map((back) => {
  const d = new Date(today.getFullYear(), today.getMonth() - back, 1);
  const iso = toISO(d);
  const used = [22, 26, 18, 30, 24, 12][5 - back];
  const reserved = [3, 2, 4, 0, 5, 5][5 - back];
  return {
    iso,
    label: monthShort(iso),
    contratadas: 30,
    utilizadas: used,
    reservadas: reserved,
    disponiveis: Math.max(30 - used - reserved, 0),
  };
});

/* ------------------------------------------------------------------ */
/* notifications                                                       */
/* ------------------------------------------------------------------ */

export const notifications: AppNotification[] = [
  {
    id: "n1",
    title: "Seu contrato vence em 7 dias",
    body: "O contrato Plano 30h encerra em " + fmtDate(contracts[0].end) + ". Renove para não perder seus horários.",
    kind: "warning",
    date: offsetISO(-1),
    read: false,
    forRole: "client",
  },
  {
    id: "n2",
    title: "Você possui apenas 3 horas disponíveis",
    body: "Seu pacote mensal está quase no limite. Considere contratar horas extras.",
    kind: "warning",
    date: offsetISO(0),
    read: false,
    forRole: "client",
  },
  {
    id: "n3",
    title: "Sua reserva para hoje às 14:00 foi confirmada",
    body: "Sala 03 — Consultório. Chegue com 10 minutos de antecedência.",
    kind: "success",
    date: offsetISO(0),
    read: false,
    forRole: "client",
  },
  {
    id: "n4",
    title: "Você realizou um cancelamento com menos de 24 horas",
    body: "A ocorrência foi registrada. Restam 1 de 3 neste ciclo.",
    kind: "danger",
    date: offsetISO(-2),
    read: true,
    forRole: "client",
  },
  {
    id: "n5",
    title: "Sua mensalidade vence em poucos dias",
    body: "Aluguel de salas — " + monthLabel(competenceDate(0)) + " no valor de R$ 900,00.",
    kind: "warning",
    date: offsetISO(-1),
    read: false,
    forRole: "client",
  },
  {
    id: "n6",
    title: "Existem 3 comprovantes aguardando análise",
    body: "Acesse Financeiro → Comprovantes para conferir e aprovar.",
    kind: "info",
    date: offsetISO(0),
    read: false,
    forRole: "admin",
  },
  {
    id: "n7",
    title: "3 pagamentos estão vencidos",
    body: "Ana Souza, Beatriz Nunes e João Costa possuem cobranças vencidas.",
    kind: "danger",
    date: offsetISO(-1),
    read: false,
    forRole: "admin",
  },
  {
    id: "n8",
    title: "2 contratos vencem nos próximos 30 dias",
    body: "João Costa (7 dias) e Ana Souza (12 dias).",
    kind: "warning",
    date: offsetISO(-2),
    read: false,
    forRole: "admin",
  },
  {
    id: "n9",
    title: "Nova solicitação de reserva",
    body: "Carlos Lima solicitou Sala 01 para " + fmtDate(offsetISO(3)) + " às 17:00.",
    kind: "info",
    date: offsetISO(0),
    read: false,
    forRole: "admin",
  },
  {
    id: "n10",
    title: "Sala 06 bloqueada para manutenção",
    body: "A cabine de atendimento online está temporariamente indisponível.",
    kind: "warning",
    date: offsetISO(-3),
    read: true,
    forRole: "admin",
  },
];

export const adminKpis = {
  activeClients: 42,
  rooms: 8,
  hoursRented: 486,
  revenue: 28450,
  occupancy: 78,
};
