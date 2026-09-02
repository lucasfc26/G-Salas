import { useState } from "react";
import { DoorOpen, Pencil, Plus, Users, Wrench } from "lucide-react";
import { useApp } from "../../store";
import { toISO } from "../../data/mock";
import {
  Avatar,
  Badge,
  Button,
  Card,
  cx,
  ProgressBar,
  SearchInput,
  SectionTitle,
  Toggle,
} from "../../components/ui";
import { RoomModal } from "../../components/modals";
import type { Room } from "../../types";

export default function Rooms() {
  const { navigate, rooms, reservations, clients, toggleRoom } = useApp();
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Room | null>(null);
  const [showBlocked, setShowBlocked] = useState(true);

  const todayISO = toISO(new Date());
  const list = rooms.filter((r) => (showBlocked ? true : !r.blocked)).filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

  const occupancyOf = (roomId: string) => {
    const total = reservations.filter(
      (r) => r.roomId === roomId && r.date.slice(0, 7) === todayISO.slice(0, 7),
    );
    const hours = total.reduce((s, r) => s + r.hours, 0);
    return Math.min(100, Math.round((hours / 300) * 100));
  };

  const toggleBlock = (id: string) => {
    void toggleRoom(id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Salas</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {rooms.length} salas cadastradas · {rooms.filter((r) => !r.blocked).length} disponíveis
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar sala..." />
          <Toggle checked={showBlocked} onChange={setShowBlocked} label="Mostrar bloqueadas" />
          <Button icon={<Plus className="h-[18px] w-[18px]" />} onClick={() => navigate("new-room")}>
            Nova sala
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((room) => {
          const occ = occupancyOf(room.id);
          const nextRes = reservations
            .filter((r) => r.roomId === room.id && r.date >= todayISO && r.status === "confirmado")
            .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
          const client = clients.find((c) => c.id === nextRes?.clientId);
          return (
            <Card key={room.id} hover className="overflow-hidden">
              <div className="relative h-40">
                <img src={room.photo} alt={room.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                <div className="absolute left-4 top-4 flex gap-2">
                  <Badge tone={room.blocked ? "red" : "green"} dot>
                    {room.blocked ? "Bloqueada" : "Disponível"}
                  </Badge>
                </div>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                  <Users className="h-4 w-4" />
                  <span className="text-[12.5px] font-bold">{room.capacity} pessoas</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-[15px] font-bold text-ink">{room.name}</h3>
                <p className="mt-0.5 text-[12.5px] text-muted">{room.type}</p>
                {room.address && <p className="mt-1 truncate text-[11.5px] text-faint">{room.address}</p>}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {room.amenities.slice(0, 4).map((a) => (
                    <span key={a} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                      {a}
                    </span>
                  ))}
                  {room.amenities.length > 4 && (
                    <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-faint">
                      +{room.amenities.length - 4}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11.5px] font-semibold">
                    <span className="text-faint">Ocupação do mês</span>
                    <span className="text-ink">{occ}%</span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={occ} tone={occ > 70 ? "brand" : "mint"} height={6} />
                  </div>
                </div>

                {nextRes && client && (
                  <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-surface-2/60 p-2.5">
                    <Avatar name={client.name} size={30} color={client.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold text-ink">{client.name}</p>
                      <p className="text-[11px] text-faint">
                        Próx.: {nextRes.start} · {nextRes.date.slice(8)}/{nextRes.date.slice(5, 7)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <Toggle checked={!room.blocked} onChange={() => toggleBlock(room.id)} />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Pencil className="h-4 w-4" />}
                      onClick={() => navigate("edit-room", room.id)}
                    >
                      Editar
                    </Button>
                    <Button size="sm" variant="soft" onClick={() => setDetail(room)}>
                      Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {list.length === 0 && (
        <Card className="p-10 text-center text-[13px] text-muted">Nenhuma sala encontrada.</Card>
      )}

      <div className={cx("rounded-2xl border border-line bg-surface-2/50 p-5")}>
        <SectionTitle title="Manutenção e bloqueios" subtitle="Salas indisponíveis aparecem cinza na agenda" icon={<Wrench className="h-[18px] w-[18px]" />} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.filter((r) => r.blocked).map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-50/60 p-3 dark:bg-rose-500/10">
              <DoorOpen className="h-5 w-5 text-rose-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink">{r.name}</p>
                <p className="text-[11.5px] text-muted">Bloqueada para manutenção</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => toggleBlock(r.id)}>
                Liberar
              </Button>
            </div>
          ))}
          {rooms.filter((r) => r.blocked).length === 0 && (
            <p className="text-[13px] text-muted">Nenhuma sala bloqueada no momento.</p>
          )}
        </div>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate("schedule")}>
          Ver impacto na agenda geral
        </Button>
      </div>

      <RoomModal open={!!detail} onClose={() => setDetail(null)} room={detail} date={todayISO} />
    </div>
  );
}
