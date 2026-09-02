export type Role = "client" | "admin";

export type SlotStatus =
  | "disponivel"
  | "solicitado"
  | "confirmado"
  | "utilizado"
  | "cancelado"
  | "indisponivel";

export type ReservationStatus =
  | "solicitado"
  | "confirmado"
  | "concluido"
  | "cancelado"
  | "nao_compareceu";

export type ContractStatus = "ativo" | "vence_em_breve" | "vencido" | "renovacao";

export type PaymentStatus = "pendente" | "em_analise" | "pago" | "recusado" | "vencido";

export type FinancialSituation = "em_dia" | "pendente" | "vencido";

export type Modality = "presencial" | "online" | "hibrido";

export interface RoomPhoto {
  id: string;
  url: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  type: string;
  capacity: number;
  hourlyPrice: number;
  amenities: string[];
  photo: string;
  photos: RoomPhoto[];
  active: boolean;
  blocked?: boolean;
}

export interface Client {
  id: string;
  name: string;
  professionalName: string;
  profession: string;
  registry: string;
  email: string;
  phone: string;
  whatsapp: string;
  document: string;
  birthDate: string;
  plan: string;
  monthlyHours: number;
  usedHours: number;
  contractStatus: ContractStatus;
  status: "ativo" | "inativo";
  modality: Modality;
  specialties: string[];
  city: string;
  joinedAt: string;
  color: string;
}

export interface Reservation {
  id: string;
  clientId: string;
  clientName: string;
  roomId: string;
  roomName: string;
  date: string; // yyyy-mm-dd
  start: string; // HH:mm
  end: string;
  hours: number;
  status: ReservationStatus;
  modality: Modality;
  type: string;
}

export interface Contract {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  status: ContractStatus;
  start: string;
  end: string;
  monthlyHours: number;
  monthlyValue: number;
  cancelLimit: number;
  cancelUsed: number;
  cancelRule: string;
  financial: FinancialSituation;
  pdf?: string;
}

export interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  competence: string;
  description: string;
  value: number;
  dueDate: string;
  paidAt?: string;
  status: PaymentStatus;
  method: string;
  receipt?: string;
  rejectionReason?: string;
  invoiceId?: string;
  paymentId?: string;
}

export interface MeUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  profession: string;
  plan?: string;
}

export interface CreditEntry {
  id: string;
  date: string;
  type: "reserva" | "cancelamento" | "credito";
  description: string;
  room?: string;
  delta: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  kind: "info" | "success" | "warning" | "danger";
  date: string;
  read: boolean;
  forRole: Role;
}
