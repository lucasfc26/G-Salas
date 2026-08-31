import { useMemo, useState } from "react";
import {
  AirVent,
  CalendarCheck,
  Clock,
  CreditCard,
  FileText,
  Info,
  MapPin,
  UploadCloud,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useApp } from "../store";
import { fmtDate, getDaySlots, HOURS, toISO, weekdayShort } from "../data/mock";
import { Alert, Avatar, Badge, Button, Card, cx, Modal, TextArea, slotStyleMap } from "./ui";
import type { Payment, Reservation, Room } from "../types";

/* ------------------------------------------------------------------ */
/* Reserve modal                                                       */
/* ------------------------------------------------------------------ */

export function ReserveModal({
  open,
  onClose,
  date,
  hour,
  roomId,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  hour: string;
  roomId: string;
}) {
  const { addReservation, credits, reservations, rooms, availabilities, me } = useApp();
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  if (!room) return null;
  const [duration, setDuration] = useState(1);

  const slots = useMemo(
    () => getDaySlots(roomId, date, reservations, rooms, availabilities),
    [roomId, date, reservations, rooms, availabilities],
  );
  const startIdx = HOURS.indexOf(hour);
  const canExtend = (d: number) =>
    Array.from({ length: d }, (_, i) => slots[startIdx + i]?.status).every((s) => s === "disponivel");

  const options = [1, 2, 3].filter((d) => startIdx + d <= HOURS.length && (d === 1 || canExtend(d)));
  const balance = Math.max(credits.available - duration, 0);

  const confirm = async () => {
    if (!options.includes(duration)) return;
    try {
      await addReservation({ roomId, roomName: room.name, date, hour, hours: duration });
      onClose();
    } catch {
      /* toast already shown */
    }
  };

  const endHour = HOURS[startIdx + duration] ?? `${(Number(hour.slice(0, 2)) + duration).toString().padStart(2, "0")}:00`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reservar sala"
      subtitle="Confira os detalhes e o consumo de créditos"
      icon={<CalendarCheck className="h-5 w-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={credits.available < duration}>
            Confirmar reserva
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface-2/50 p-4">
          <img src={room.photo} alt={room.name} className="h-16 w-16 rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-ink">{room.name}</p>
            <p className="text-[12.5px] text-muted">{room.type} · até {room.capacity} pessoas</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoCell label="Data" value={`${weekdayShort(date).replace(".", "")} · ${fmtDate(date)}`} icon={<Clock className="h-4 w-4" />} />
          <InfoCell
            label="Horário"
            value={`${hour} — ${endHour}`}
            icon={<Clock className="h-4 w-4" />}
          />
        </div>

        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">Duração</p>
          <div className="flex gap-2">
            {options.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cx(
                  "flex-1 rounded-xl border px-3 py-2.5 text-[13px] font-bold transition-all",
                  duration === d
                    ? "border-brand-600 bg-brand-600 text-white shadow-[0_8px_18px_-10px_rgba(20,100,133,.9)]"
                    : "border-line bg-surface text-muted hover:border-brand-300",
                )}
              >
                {d}h
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-500/10">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-rose-600">Crédito utilizado</p>
            <p className="mt-1 text-[20px] font-extrabold text-rose-700 dark:text-rose-400">-{duration}h</p>
          </div>
          <div className="rounded-2xl bg-mint-50 p-4 dark:bg-mint-500/10">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mint-700">Saldo após reserva</p>
            <p className="mt-1 text-[20px] font-extrabold text-mint-700 dark:text-mint-400">{balance}h</p>
          </div>
        </div>

        {credits.available < duration && (
          <Alert kind="danger" title="Créditos insuficientes">
            Você possui {credits.available}h disponíveis. Contrate horas extras para continuar reservando.
          </Alert>
        )}

        <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface-2/50 p-3.5 text-[12.5px] text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <p>
            Cancelamentos com <strong>mais de 24h</strong> devolvem o crédito integralmente. Dentro de 24h o
            crédito pode ser perdido e contabilizado como ocorrência.
          </p>
        </div>

        <p className="text-[11.5px] text-faint">
          Titular: {me?.name ?? "Profissional"} · Plano {credits.contracted}h/mês
        </p>
      </div>
    </Modal>
  );
}

function InfoCell({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2/50 p-3.5">
      <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
        {icon} {label}
      </p>
      <p className="mt-1 text-[13.5px] font-bold text-ink">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Room details modal                                                  */
/* ------------------------------------------------------------------ */

export function RoomModal({
  open,
  onClose,
  room,
  date,
}: {
  open: boolean;
  onClose: () => void;
  room: Room | null;
  date: string;
}) {
  const { reservations, rooms, availabilities } = useApp();
  const [pick, setPick] = useState<{ hour: string } | null>(null);
  if (!room) return null;
  const slots = getDaySlots(room.id, date, reservations, rooms, availabilities);
  const free = slots.filter((s) => s.status === "disponivel");

  return (
    <>
      <Modal open={open} onClose={onClose} title={room.name} subtitle={room.type} size="lg">
        <div className="space-y-5">
          <div className="relative h-44 overflow-hidden rounded-2xl sm:h-56">
            <img src={room.photo} alt={room.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
            <div className="absolute bottom-4 left-4 flex gap-2">
              <Badge tone={room.blocked ? "red" : "green"} dot>
                {room.blocked ? "Bloqueada" : "Disponível"}
              </Badge>
              <Badge tone="brand">
                <Users className="mr-1 h-3 w-3" /> {room.capacity} pessoas
              </Badge>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">Características</p>
            <div className="flex flex-wrap gap-2">
              {room.amenities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[12.5px] font-medium text-muted"
                >
                  {a.includes("Wi-Fi") ? <Wifi className="h-3.5 w-3.5" /> : a.includes("Ar") ? <AirVent className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {a}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">
              Disponibilidade · {fmtDate(date)}
            </p>
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => {
                const st = slotStyleMap[s.status];
                return (
                  <button
                    key={s.hour}
                    disabled={s.status !== "disponivel"}
                    onClick={() => setPick({ hour: s.hour })}
                    className={cx(
                      "rounded-xl border px-3 py-2 text-[12.5px] font-bold transition-all duration-200",
                      st.cls,
                      s.status === "disponivel" && "hover:-translate-y-0.5",
                    )}
                  >
                    {s.hour}
                  </button>
                );
              })}
            </div>
            {free.length === 0 && (
              <p className="mt-3 text-[13px] text-muted">Nenhum horário livre nesta data para esta sala.</p>
            )}
          </div>
        </div>
      </Modal>

      <ReserveModal
        open={!!pick && open}
        onClose={() => setPick(null)}
        date={date}
        hour={pick?.hour ?? "09:00"}
        roomId={room.id}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reservation details                                                 */
/* ------------------------------------------------------------------ */

export function ReservationDetailsModal({
  open,
  onClose,
  reservation,
  onCancel,
}: {
  open: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  onCancel?: (r: Reservation, late: boolean) => void;
}) {
  if (!reservation) return null;
  const cancelable = ["confirmado", "solicitado"].includes(reservation.status);
  const hoursToStart =
    (new Date(`${reservation.date}T${reservation.start}:00`).getTime() - Date.now()) / 3600000;
  const late = hoursToStart < 24;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalhes da reserva"
      subtitle={`${reservation.roomName} · ${fmtDate(reservation.date)}`}
      icon={<FileText className="h-5 w-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          {cancelable && onCancel && (
            <Button variant="danger" onClick={() => onCancel(reservation, late)}>
              Cancelar reserva
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface-2/50 p-4">
          <Avatar name={reservation.clientName} size={44} />
          <div>
            <p className="text-[14px] font-bold text-ink">{reservation.clientName}</p>
            <p className="text-[12.5px] text-muted">{reservation.type} · {reservation.modality}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoCell label="Data" value={fmtDate(reservation.date)} icon={<Clock className="h-4 w-4" />} />
          <InfoCell label="Início" value={reservation.start} icon={<Clock className="h-4 w-4" />} />
          <InfoCell label="Fim" value={reservation.end} icon={<Clock className="h-4 w-4" />} />
          <InfoCell label="Créditos" value={`${reservation.hours}h`} icon={<CreditCard className="h-4 w-4" />} />
        </div>
        {cancelable && late && (
          <Alert kind="warning" title="Cancelamento com menos de 24 horas">
            Ao cancelar agora o crédito de {reservation.hours}h será perdido e a ocorrência contabilizada no
            seu limite mensal.
          </Alert>
        )}
        {cancelable && !late && (
          <Alert kind="success" title="Crédito devolvido integralmente">
            Cancelamentos com mais de 24h devolvem {reservation.hours}h ao seu saldo.
          </Alert>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Receipt upload                                                      */
/* ------------------------------------------------------------------ */

export function ReceiptModal({
  open,
  onClose,
  payment,
}: {
  open: boolean;
  onClose: () => void;
  payment: Payment | null;
}) {
  const { submitReceipt } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [drag, setDrag] = useState(false);
  if (!payment) return null;

  const send = async () => {
    if (!file) return;
    try {
      await submitReceipt(payment.id, file, note.trim() || undefined);
      setFile(null);
      setNote("");
      onClose();
    } catch {
      /* toast already shown */
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar comprovante de pagamento"
      subtitle="A administração será notificada para análise"
      icon={<UploadCloud className="h-5 w-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={send} disabled={!file}>Enviar comprovante</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Card className="bg-surface-2/50 p-4">
          <Row label="Cobrança" value={payment.competence} />
          <Row label="Valor" value={`R$ ${payment.value.toLocaleString("pt-BR")},00`} />
          <Row label="Vencimento" value={fmtDate(payment.dueDate)} />
        </Card>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            setFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cx(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-all",
            drag ? "border-brand-500 bg-brand-50/60 dark:bg-brand-500/10" : "border-line bg-surface-2/40",
          )}
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <UploadCloud className="h-6 w-6" />
          </span>
          {file ? (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-600" />
              <span className="text-[13.5px] font-semibold text-ink">{file.name}</span>
              <button onClick={() => setFile(null)} className="text-faint hover:text-rose-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-[13.5px] font-bold text-ink">Arraste o comprovante aqui</p>
              <p className="mt-1 text-[12.5px] text-muted">ou</p>
            </>
          )}
          <label className="mt-3 cursor-pointer rounded-xl bg-brand-600 px-4 py-2 text-[13px] font-bold text-white shadow-[0_8px_18px_-10px_rgba(20,100,133,.9)]">
            Selecionar arquivo
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-3 text-[11.5px] text-faint">Formatos aceitos: PDF, JPG, JPEG e PNG · até 10 MB</p>
        </div>

        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-faint">
            Observação <span className="font-normal normal-case">(opcional)</span>
          </p>
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Adicione alguma informação sobre este pagamento..."
          />
        </div>
      </div>
    </Modal>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 last:border-0">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-[13px] font-bold text-ink">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reject receipt (admin)                                              */
/* ------------------------------------------------------------------ */

export function RejectModal({
  open,
  onClose,
  payment,
}: {
  open: boolean;
  onClose: () => void;
  payment: Payment | null;
}) {
  const { rejectPayment } = useApp();
  const [reason, setReason] = useState("Comprovante ilegível");
  if (!payment) return null;
  const reasons = ["Comprovante ilegível", "Valor divergente", "Pagamento não localizado", "Comprovante inválido"];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Motivo da recusa"
      subtitle={`${payment.clientName} · ${payment.competence}`}
      size="sm"
      icon={<X className="h-5 w-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              rejectPayment(payment.id, reason);
              onClose();
            }}
          >
            Recusar comprovante
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={cx(
                "flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-medium transition-all",
                reason === r
                  ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                  : "border-line bg-surface text-muted hover:border-rose-300",
              )}
            >
              <span
                className={cx(
                  "flex h-4 w-4 items-center justify-center rounded-full border-2",
                  reason === r ? "border-rose-500 bg-rose-500" : "border-line",
                )}
              >
                {reason === r && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {r}
            </button>
          ))}
        </div>
        <TextArea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[80px]" />
      </div>
    </Modal>
  );
}

export const todayISO = () => toISO(new Date());
