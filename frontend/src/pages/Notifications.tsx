import { useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle } from "lucide-react";
import { useApp } from "../store";
import { fmtDate } from "../data/mock";
import { Badge, Button, Card, Chip, EmptyState, cx } from "../components/ui";

const kindMap = {
  success: { icon: <CheckCircle2 className="h-5 w-5" />, cls: "bg-mint-50 text-mint-600 dark:bg-mint-500/15 dark:text-mint-400" },
  warning: { icon: <AlertTriangle className="h-5 w-5" />, cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
  danger: { icon: <XCircle className="h-5 w-5" />, cls: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" },
  info: { icon: <Info className="h-5 w-5" />, cls: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300" },
};

export default function Notifications() {
  const { notifications, role, markAllRead, markRead, unreadCount } = useApp();
  const [filter, setFilter] = useState<"todas" | "naolidas">("todas");
  const list = notifications
    .filter((n) => n.forRole === role)
    .filter((n) => (filter === "naolidas" ? !n.read : true));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">
            Central de notificações
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {unreadCount} não lida(s) de {notifications.filter((n) => n.forRole === role).length} no total
          </p>
        </div>
        <div className="flex gap-2">
          <Chip active={filter === "todas"} onClick={() => setFilter("todas")}>
            Todas
          </Chip>
          <Chip active={filter === "naolidas"} onClick={() => setFilter("naolidas")}>
            Não lidas
          </Chip>
          <Button variant="outline" onClick={markAllRead}>
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Tudo em dia"
          message="Você não possui notificações pendentes."
        />
      ) : (
        <div className="space-y-3">
          {list.map((n) => {
            const k = kindMap[n.kind];
            return (
              <Card
                key={n.id}
                hover
                className={cx("flex gap-4 p-4 sm:p-5", !n.read && "border-brand-300 dark:border-brand-500/40")}
              >
                <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", k.cls)}>
                  {k.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-bold text-ink">{n.title}</p>
                    {!n.read && (
                      <Badge tone="brand" dot>
                        Nova
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{n.body}</p>
                  <p className="mt-2 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                    {fmtDate(n.date)}
                  </p>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                    Marcar como lida
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
