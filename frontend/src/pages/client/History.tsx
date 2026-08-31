import { useMemo, useState } from "react";
import { FileText, ListFilter, Search } from "lucide-react";
import { useApp } from "../../store";
import { fmtDate, fromISO } from "../../data/mock";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  SectionTitle,
  Select,
  StatusBadge,
} from "../../components/ui";
import { ReservationDetailsModal } from "../../components/modals";
import type { Modality, Reservation, ReservationStatus } from "../../types";

const statuses: (ReservationStatus | "todos")[] = [
  "todos",
  "confirmado",
  "concluido",
  "cancelado",
  "nao_compareceu",
  "solicitado",
];

export default function History() {
  const { reservations, cancelReservation, currentClientId, rooms } = useApp();
  const [status, setStatus] = useState<ReservationStatus | "todos">("todos");
  const [room, setRoom] = useState("todas");
  const [modality, setModality] = useState<Modality | "todos">("todos");
  const [period, setPeriod] = useState("90");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Reservation | null>(null);

  const list = useMemo(() => {
    const min = new Date();
    min.setDate(min.getDate() - Number(period));
    return reservations
      .filter((r) => r.clientId === currentClientId)
      .filter((r) => (status === "todos" ? true : r.status === status))
      .filter((r) => (room === "todas" ? true : r.roomId === room))
      .filter((r) => (modality === "todos" ? true : r.modality === modality))
      .filter((r) => (period === "all" ? true : fromISO(r.date) >= min))
      .filter((r) => r.roomName.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  }, [reservations, status, room, modality, period, q, currentClientId]);

  const totalHours = list.filter((r) => r.status !== "cancelado").reduce((s, r) => s + r.hours, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">
            Histórico de reservas
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {list.length} reserva(s) · {totalHours}h de crédito consumido
          </p>
        </div>
      </div>

      <Card className="p-5">
        <SectionTitle title="Filtros" icon={<ListFilter className="h-[18px] w-[18px]" />} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Período">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="30">Últimos 30 dias</option>
              <option value="60">Últimos 60 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="all">Todos</option>
            </Select>
          </Field>
          <Field label="Sala">
            <Select value={room} onChange={(e) => setRoom(e.target.value)}>
              <option value="todas">Todas</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Modalidade">
            <Select value={modality} onChange={(e) => setModality(e.target.value as Modality | "todos")}>
              <option value="todos">Todas</option>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
              <option value="hibrido">Híbrido</option>
            </Select>
          </Field>
          <Field label="Buscar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Sala..." />
            </div>
          </Field>
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatus("todos");
                setRoom("todas");
                setModality("todos");
                setPeriod("90");
                setQ("");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {statuses.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "todos" ? "Todos os status" : s.replace("_", " ")}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {/* desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-2/50 text-left">
                {["Data", "Horário", "Sala", "Duração", "Status", "Créditos", ""].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-[11.5px] font-bold uppercase tracking-wide text-faint"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setDetail(r)}
                  className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-surface-2/60"
                >
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-ink">{fmtDate(r.date)}</td>
                  <td className="px-5 py-3.5 text-[13px] text-muted">
                    {r.start} — {r.end}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted">{r.roomName}</td>
                  <td className="px-5 py-3.5 text-[13px] text-muted">{r.hours}h</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-bold text-ink">-{r.hours}h</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-[12px] font-semibold text-brand-600">Ver detalhes</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mobile cards */}
        <div className="divide-y divide-line md:hidden">
          {list.map((r) => (
            <button
              key={r.id}
              onClick={() => setDetail(r)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2/60"
            >
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-brand-600 text-white">
                <span className="text-[13px] font-extrabold leading-none">{r.start.slice(0, 2)}</span>
                <span className="text-[9.5px] font-semibold uppercase">{r.start.slice(3)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink">{r.roomName}</p>
                <p className="text-[12.5px] text-muted">
                  {fmtDate(r.date)} · {r.hours}h
                </p>
                <div className="mt-1.5">
                  <StatusBadge status={r.status} />
                </div>
              </div>
              <Badge tone="slate">-{r.hours}h</Badge>
            </button>
          ))}
        </div>

        {list.length === 0 && (
          <div className="p-6">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Nenhuma reserva encontrada"
              message="Ajuste os filtros para visualizar outros resultados."
            />
          </div>
        )}
      </Card>

      <ReservationDetailsModal
        open={!!detail}
        onClose={() => setDetail(null)}
        reservation={detail}
        onCancel={(r, late) => {
          cancelReservation(r.id, late);
          setDetail(null);
        }}
      />
    </div>
  );
}
