import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  Filter,
  Info,
  Users,
} from "lucide-react";
import { useApp } from "../../store";
import { fmtDate, fromISO, getDaySlots, HOURS, monthMatrix, toISO, weekOf, weekdayShort } from "../../data/mock";
import { Badge, Button, Card, cx, EmptyState, SectionTitle, Select, slotStyleMap } from "../../components/ui";
import { ReserveModal, RoomModal } from "../../components/modals";
import type { Room } from "../../types";

type View = "mes" | "semana" | "dia";

const LEGEND = (["disponivel", "solicitado", "confirmado", "utilizado", "cancelado", "indisponivel"] as const).map(
  (k) => ({ key: k, ...slotStyleMap[k] }),
);

export default function Agenda() {
  const { reservations, rooms, currentClientId, availabilities } = useApp();
  const [view, setView] = useState<View>("dia");
  const [date, setDate] = useState(toISO(new Date()));
  const [roomFilter, setRoomFilter] = useState("all");
  const [pick, setPick] = useState<{ roomId: string; hour: string } | null>(null);
  const [roomDetail, setRoomDetail] = useState<Room | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const myReservations = reservations.filter((r) => r.clientId === currentClientId);

  const visibleRooms = rooms.filter((r) => (roomFilter === "all" ? true : r.id === roomFilter));

  const go = (dir: number) => {
    setDate((d) => {
      const cur = fromISO(d);
      cur.setDate(cur.getDate() + (view === "mes" ? dir * 30 : view === "semana" ? dir * 7 : dir));
      return toISO(cur);
    });
  };

  const title = useMemo(() => {
    const d = fromISO(date);
    if (view === "mes") return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    if (view === "semana") return `${fmtDate(weekOf(date)[0])} — ${fmtDate(weekOf(date)[6])}`;
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }, [date, view]);

  const onTouchStart = (e: React.TouchEvent) =>
    (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    touch.current = null;
  };

  const resOn = (iso: string) => myReservations.filter((r) => r.date === iso);
  const resAt = (iso: string, hour: string) =>
    myReservations.find(
      (r) => r.date === iso && Number(r.start.slice(0, 2)) <= Number(hour.slice(0, 2)) && Number(hour.slice(0, 2)) < Number(r.end.slice(0, 2)),
    );

  const statusTone: Record<string, string> = {
    solicitado: "bg-amber-500",
    confirmado: "bg-brand-600",
    concluido: "bg-slate-400",
    cancelado: "bg-rose-400",
    nao_compareceu: "bg-slate-400",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Agenda</h1>
          <p className="mt-1 text-[13.5px] text-muted capitalize">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-line bg-surface p-1">
            {([
              ["mes", "Mês"],
              ["semana", "Semana"],
              ["dia", "Dia"],
            ] as [View, string][]).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={cx(
                  "rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold transition-all",
                  view === k ? "bg-brand-600 text-white" : "text-muted hover:text-ink",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            <button onClick={() => go(-1)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => setDate(toISO(new Date()))}
              className="px-3 py-1 text-[12.5px] font-bold text-brand-600 hover:underline"
            >
              Hoje
            </button>
            <button onClick={() => go(1)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {view === "dia" && (
            <Card className="p-5">
              <SectionTitle
                title="Horários por sala"
                subtitle="Toque em um horário disponível para reservar"
                icon={<Clock className="h-[18px] w-[18px]" />}
                action={
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-faint" />
                    <Select
                      value={roomFilter}
                      onChange={(e) => setRoomFilter(e.target.value)}
                      className="w-[190px] py-2"
                    >
                      <option value="all">Todas as salas</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                }
              />

              <div className="space-y-4">
                {visibleRooms.map((room) => {
                  const slots = getDaySlots(room.id, date, reservations, rooms, availabilities);
                  return (
                    <div
                      key={room.id}
                      className="rounded-2xl border border-line bg-surface-2/30 p-4 transition-colors hover:border-brand-200"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <button onClick={() => setRoomDetail(room)} className="flex items-center gap-3 text-left">
                          <img src={room.photo} alt="" className="h-11 w-11 rounded-xl object-cover" />
                          <span>
                            <span className="block text-[13.5px] font-bold text-ink hover:underline">
                              {room.name}
                            </span>
                            <span className="block text-[12px] text-muted">
                              {room.type} · <Users className="mr-0.5 inline h-3 w-3" />
                              {room.capacity}
                            </span>
                          </span>
                        </button>
                        <div className="flex items-center gap-2">
                          {room.blocked && (
                            <Badge tone="red" dot>
                              Bloqueada
                            </Badge>
                          )}
                          <span className="text-[11.5px] font-semibold text-faint">
                            {slots.filter((s) => s.status === "disponivel").length} livres
                          </span>
                        </div>
                      </div>
                      <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-1">
                        {slots.map((s) => {
                          const st = slotStyleMap[s.status];
                          const mine = s.reservation && s.reservation.clientId === currentClientId;
                          return (
                            <button
                              key={s.hour}
                              disabled={s.status !== "disponivel"}
                              onClick={() => setPick({ roomId: room.id, hour: s.hour })}
                              className={cx(
                                "min-w-[92px] shrink-0 snap-start rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                                st.cls,
                                s.status === "disponivel" && "hover:-translate-y-0.5 hover:shadow-md",
                                mine && "ring-2 ring-brand-500/40",
                              )}
                            >
                              <span className="block text-[13px] font-extrabold">{s.hour}</span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide">
                                <span className={cx("h-1.5 w-1.5 rounded-full", st.dot)} />
                                {mine ? "Seu atendimento" : st.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {view === "semana" && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-line bg-surface-2/50">
                    <div />
                    {weekOf(date).map((iso) => (
                      <div key={iso} className="px-2 py-3 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-faint">
                          {weekdayShort(iso).replace(".", "")}
                        </p>
                        <p
                          className={cx(
                            "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] font-extrabold",
                            iso === toISO(new Date()) ? "bg-brand-600 text-white" : "text-ink",
                          )}
                        >
                          {fromISO(iso).getDate()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-line">
                    {HOURS.map((hour) => (
                      <div key={hour} className="grid grid-cols-[64px_repeat(7,1fr)]">
                        <div className="px-2 py-2 text-[11px] font-bold text-faint">{hour}</div>
                        {weekOf(date).map((iso) => {
                          const r = resAt(iso, hour);
                          return (
                            <div key={iso} className="border-l border-line p-1">
                              {r ? (
                                <div
                                  className={cx(
                                    "rounded-lg px-2 py-2 text-[10.5px] font-bold text-white",
                                    statusTone[r.status],
                                  )}
                                >
                                  <p className="truncate">{r.roomName.split("—")[0].trim()}</p>
                                  <p className="opacity-80">{r.start}–{r.end}</p>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setDate(iso);
                                    setView("dia");
                                  }}
                                  className="h-full w-full rounded-lg border border-transparent py-2 text-[10px] font-semibold text-transparent transition-colors hover:border-mint-500/40 hover:bg-mint-50 hover:text-mint-600 dark:hover:bg-mint-500/10"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {view === "mes" && (
            <Card className="p-4 sm:p-5">
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="py-2 text-[11px] font-bold uppercase tracking-wide text-faint">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {monthMatrix(fromISO(date).getFullYear(), fromISO(date).getMonth()).map((cell) => {
                  const list = resOn(cell.iso);
                  const isToday = cell.iso === toISO(new Date());
                  const isSel = cell.iso === date;
                  return (
                    <button
                      key={cell.iso}
                      onClick={() => {
                        setDate(cell.iso);
                        setView("dia");
                      }}
                      className={cx(
                        "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border p-1 transition-all duration-200",
                        isSel
                          ? "border-brand-600 bg-brand-600 text-white"
                          : isToday
                            ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
                            : cell.inMonth
                              ? "border-line bg-surface hover:border-brand-300"
                              : "border-transparent bg-transparent opacity-40",
                      )}
                    >
                      <span className={cx("text-[12.5px] font-bold", !isSel && "text-ink")}>
                        {fromISO(cell.iso).getDate()}
                      </span>
                      <span className="flex h-1.5 items-center gap-0.5">
                        {list.slice(0, 3).map((r) => (
                          <span
                            key={r.id}
                            className={cx("h-1.5 w-1.5 rounded-full", isSel ? "bg-white" : statusTone[r.status])}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* side */}
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Legenda" icon={<Info className="h-[18px] w-[18px]" />} />
            <div className="space-y-2">
              {LEGEND.map((l) => (
                <div key={l.key} className="flex items-center gap-2.5">
                  <span className={cx("h-2.5 w-2.5 rounded-full", l.dot)} />
                  <span className="text-[13px] font-medium text-muted">{l.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Meus horários" subtitle={`${fmtDate(date)}`} icon={<CalendarDays className="h-[18px] w-[18px]" />} />
            <div className="space-y-2.5">
              {resOn(date).length === 0 && (
                <EmptyState
                  icon={<CalendarDays className="h-6 w-6" />}
                  title="Sem reservas"
                  message="Você ainda não possui atendimentos nesta data."
                  action={
                    <Button size="sm" onClick={() => setView("dia")}>
                      Ver horários livres
                    </Button>
                  }
                />
              )}
              {resOn(date).map((r) => (
                <div key={r.id} className="rounded-xl border border-line bg-surface-2/40 p-3">
                  <p className="text-[13px] font-bold text-ink">
                    {r.start} — {r.end}
                  </p>
                  <p className="text-[12.5px] text-muted">{r.roomName}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={cx("h-2 w-2 rounded-full", statusTone[r.status])} />
                    <span className="text-[11.5px] font-semibold uppercase text-faint">{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Salas" icon={<DoorOpen className="h-[18px] w-[18px]" />} />
            <div className="space-y-2">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRoomDetail(r)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-left transition-all hover:border-brand-300 hover:bg-surface-2"
                >
                  <img src={r.photo} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-ink">{r.name}</span>
                    <span className="block text-[11.5px] text-faint">{r.type}</span>
                  </span>
                  {r.blocked && (
                    <Badge tone="red" dot>
                      Bloq
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ReserveModal
        open={!!pick}
        onClose={() => setPick(null)}
        date={date}
        hour={pick?.hour ?? "09:00"}
        roomId={pick?.roomId ?? "r1"}
      />
      <RoomModal open={!!roomDetail} onClose={() => setRoomDetail(null)} room={roomDetail} date={date} />
    </div>
  );
}
