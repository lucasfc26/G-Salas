import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Users,
} from "lucide-react";
import { useApp } from "../../store";
import { fromISO, getDaySlots, toISO, weekOf, weekdayShort } from "../../data/mock";
import {
  Avatar,
  Badge,
  Button,
  Card,
  cx,
  EmptyState,
  Field,
  SectionTitle,
  Select,
  slotStyleMap,
  StatusBadge,
} from "../../components/ui";
import { ReservationDetailsModal, RoomModal } from "../../components/modals";
import type { Reservation, Room } from "../../types";

export default function AgendaGeral() {
  const { reservations, rooms, clients, availabilities } = useApp();
  const [date, setDate] = useState(toISO(new Date()));
  const [view, setView] = useState<"dia" | "lista">("dia");
  const [roomFilter, setRoomFilter] = useState("todas");
  const [clientFilter, setClientFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [roomDetail, setRoomDetail] = useState<Room | null>(null);

  const go = (dir: number) =>
    setDate((d) => {
      const c = fromISO(d);
      c.setDate(c.getDate() + dir);
      return toISO(c);
    });

  const filtered = useMemo(
    () =>
      reservations
        .filter((r) => (roomFilter === "todas" ? true : r.roomId === roomFilter))
        .filter((r) => (clientFilter === "todos" ? true : r.clientId === clientFilter))
        .filter((r) => (statusFilter === "todos" ? true : r.status === statusFilter)),
    [reservations, roomFilter, clientFilter, statusFilter],
  );

  const dayRes = filtered.filter((r) => r.date === date).sort((a, b) => a.start.localeCompare(b.start));
  const visibleRooms = rooms.filter((r) => (roomFilter === "todas" ? true : r.id === roomFilter));

  const resAt = (roomId: string, hour: string) =>
    dayRes.find(
      (r) => r.roomId === roomId && Number(r.start.slice(0, 2)) <= Number(hour.slice(0, 2)) && Number(hour.slice(0, 2)) < Number(r.end.slice(0, 2)),
    );

  const statusBlock: Record<string, string> = {
    solicitado: "bg-amber-500 text-white",
    confirmado: "bg-brand-600 text-white",
    concluido: "bg-slate-400 text-white",
    cancelado: "bg-rose-400 text-white line-through",
    nao_compareceu: "bg-slate-600 text-white",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Agenda geral</h1>
          <p className="mt-1 text-[13.5px] text-muted capitalize">
            {fromISO(date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} ·{" "}
            {dayRes.length} reserva(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-line bg-surface p-1">
            {(
              [
                ["dia", <Clock key="d" className="h-4 w-4" />],
                ["lista", <List key="l" className="h-4 w-4" />],
              ] as ["dia" | "lista", React.ReactNode][]
            ).map(([k, icon]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={cx(
                  "rounded-lg px-3 py-1.5 transition-all",
                  view === k ? "bg-brand-600 text-white" : "text-muted hover:text-ink",
                )}
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            <button onClick={() => go(-1)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
            <button onClick={() => setDate(toISO(new Date()))} className="px-3 py-1 text-[12.5px] font-bold text-brand-600 hover:underline">
              Hoje
            </button>
            <button onClick={() => go(1)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* week strip */}
      <Card className="p-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {weekOf(date).map((iso) => {
            const count = filtered.filter((r) => r.date === iso).length;
            const isSel = iso === date;
            return (
              <button
                key={iso}
                onClick={() => setDate(iso)}
                className={cx(
                  "flex min-w-[74px] flex-col items-center rounded-xl border px-3 py-2.5 transition-all",
                  isSel ? "border-brand-600 bg-brand-600 text-white" : "border-line hover:border-brand-300",
                )}
              >
                <span className={cx("text-[10.5px] font-bold uppercase tracking-wide", isSel ? "text-white/80" : "text-faint")}>
                  {weekdayShort(iso).replace(".", "")}
                </span>
                <span className={cx("text-[15px] font-extrabold", isSel ? "text-white" : "text-ink")}>
                  {fromISO(iso).getDate()}
                </span>
                <span className={cx("mt-0.5 text-[10px] font-semibold", isSel ? "text-white/80" : "text-faint")}>
                  {count} reserva{count === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Filtros" icon={<Users className="h-[18px] w-[18px]" />} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Sala">
            <Select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
              <option value="todas">Todas as salas</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cliente">
            <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="todos">Todos os clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="solicitado">Solicitado</option>
              <option value="confirmado">Confirmado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
              <option value="nao_compareceu">Não compareceu</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRoomFilter("todas");
                setClientFilter("todos");
                setStatusFilter("todos");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </div>
      </Card>

      {view === "dia" ? (
        <div className="space-y-4">
          {visibleRooms.map((room) => {
            const slots = getDaySlots(room.id, date, reservations, rooms, availabilities);
            const booked = dayRes.filter((r) => r.roomId === room.id);
            return (
              <Card key={room.id} className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <button onClick={() => setRoomDetail(room)} className="flex items-center gap-3 text-left">
                    <img src={room.photo} alt="" className="h-11 w-11 rounded-xl object-cover" />
                    <span>
                      <span className="block text-[14px] font-bold text-ink hover:underline">{room.name}</span>
                      <span className="block text-[12px] text-muted">
                        {booked.length} reserva(s) · {booked.reduce((s, r) => s + r.hours, 0)}h ocupadas
                      </span>
                    </span>
                  </button>
                  {room.blocked && (
                    <Badge tone="red" dot>
                      Bloqueada
                    </Badge>
                  )}
                </div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {slots.map((s) => {
                    const r = resAt(room.id, s.hour);
                    if (r) {
                      const client = clients.find((c) => c.id === r.clientId);
                      return (
                        <button
                          key={s.hour}
                          onClick={() => setDetail(r)}
                          className={cx(
                            "flex min-w-[130px] shrink-0 flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-transform hover:-translate-y-0.5",
                            statusBlock[r.status],
                          )}
                        >
                          <span className="text-[11.5px] font-bold">
                            {s.hour} — {r.end}
                          </span>
                          <span className="flex items-center gap-1.5 text-[12px] font-semibold">
                            {client && <Avatar name={client.name} size={20} color={client.color} />}
                            <span className="truncate">{r.clientName}</span>
                          </span>
                        </button>
                      );
                    }
                    const st = slotStyleMap[s.status];
                    return (
                      <div
                        key={s.hour}
                        className={cx(
                          "min-w-[92px] shrink-0 rounded-xl border px-3 py-2.5 text-left",
                          st.cls,
                        )}
                      >
                        <span className="block text-[13px] font-extrabold">{s.hour}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide">
                          <span className={cx("h-1.5 w-1.5 rounded-full", st.dot)} />
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          {dayRes.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<CalendarDays className="h-6 w-6" />}
                title="Nenhuma reserva"
                message="Não há reservas para os filtros selecionados nesta data."
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line bg-surface-2/50 text-left">
                      {["Horário", "Cliente", "Sala", "Duração", "Modalidade", "Status"].map((h) => (
                        <th key={h} className="px-5 py-3 text-[11.5px] font-bold uppercase tracking-wide text-faint">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dayRes.map((r) => {
                      const c = clients.find((x) => x.id === r.clientId);
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setDetail(r)}
                          className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-surface-2/60"
                        >
                          <td className="px-5 py-3.5 text-[13px] font-semibold text-ink">
                            {r.start} — {r.end}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="flex items-center gap-2">
                              <Avatar name={r.clientName} size={28} color={c?.color} />
                              <span className="text-[13px] text-ink">{r.clientName}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-muted">{r.roomName}</td>
                          <td className="px-5 py-3.5 text-[13px] text-muted">{r.hours}h</td>
                          <td className="px-5 py-3.5 text-[13px] capitalize text-muted">{r.modality}</td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={r.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-line md:hidden">
                {dayRes.map((r) => (
                  <button key={r.id} onClick={() => setDetail(r)} className="flex w-full items-center gap-3 p-4 text-left">
                    <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-brand-600 text-white">
                      <span className="text-[12.5px] font-extrabold leading-none">{r.start.slice(0, 2)}</span>
                      <span className="text-[9px] font-semibold uppercase">{r.start.slice(3)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-ink">{r.clientName}</p>
                      <p className="truncate text-[12px] text-muted">{r.roomName}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      <ReservationDetailsModal
        open={!!detail}
        onClose={() => setDetail(null)}
        reservation={detail}
        onCancel={(r) => {
          void r;
        }}
      />
      <RoomModal open={!!roomDetail} onClose={() => setRoomDetail(null)} room={roomDetail} date={date} />
    </div>
  );
}
