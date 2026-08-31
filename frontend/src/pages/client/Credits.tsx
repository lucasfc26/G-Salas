import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Coins, Info, Timer } from "lucide-react";
import { useApp } from "../../store";
import { fmtDate, monthLabel, toISO } from "../../data/mock";
import { Alert, Badge, Button, Card, cx, ProgressBar, SectionTitle, StatCard } from "../../components/ui";

export default function Credits() {
  const { credits, creditEntries, navigate, payments, reservations, currentClientId, contracts, usageByMonth } = useApp();
  const contract = contracts.find((c) => c.clientId === currentClientId);
  const entries = creditEntries;
  const pending = payments.filter(
    (p) => p.clientId === currentClientId && (p.status === "pendente" || p.status === "vencido"),
  );
  const used = credits.used;
  const available = credits.available;
  const pct = credits.contracted ? Math.round((used / credits.contracted) * 100) : 0;
  const reservedFuture = reservations
    .filter(
      (r) =>
        r.clientId === currentClientId &&
        ["confirmado", "solicitado"].includes(r.status) &&
        r.date >= toISO(new Date()),
    )
    .reduce((s, r) => s + r.hours, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Créditos</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Acompanhe o consumo das horas do seu plano {contract?.monthlyHours ?? credits.contracted}h/mês.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* big indicator */}
        <Card className="relative overflow-hidden p-6 lg:col-span-2">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand-500/10 blur-2xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
                Créditos disponíveis
              </p>
              <p className="mt-2 text-[56px] font-extrabold leading-none tracking-tight text-ink">
                {available}
                <span className="text-[28px] text-brand-600">h</span>
              </p>
              <p className="mt-2 text-[13.5px] text-muted">
                Ciclo de {monthLabel(toISO(new Date()))} · plano {credits.contracted}h
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge tone="brand">{credits.contracted}h contratadas</Badge>
                <Badge tone="amber">{used}h utilizadas</Badge>
                <Badge tone="green">{available}h disponíveis</Badge>
              </div>
            </div>
            <div className="w-full max-w-[240px]">
              <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" className="text-surface-2" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="url(#grad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (1 - pct / 100)}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#2fa37c" />
                      <stop offset="100%" stopColor="#146485" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute text-center">
                  <p className="text-[24px] font-extrabold text-ink">{pct}%</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">consumido</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative mt-6">
            <ProgressBar value={used} max={credits.contracted} height={10} />
            <div className="mt-2 flex justify-between text-[11.5px] font-semibold text-faint">
              <span>0h</span>
              <span>{credits.contracted}h</span>
            </div>
          </div>
          {available <= 5 && (
            <div className="relative mt-4">
              <Alert kind="warning" title="Você possui poucas horas disponíveis">
                Restam apenas {available}h. Considere contratar um pacote extra de horas.
              </Alert>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <StatCard
            label="Reservas futuras"
            value={`${reservedFuture}h`}
            sub="Horas já comprometidas na agenda"
            icon={<CalendarClock className="h-5 w-5" />}
            tone="brand"
          />
          <Card className="p-5">
            <SectionTitle title="Plano × Créditos" icon={<Coins className="h-[18px] w-[18px]" />} />
            <div className="space-y-3">
              <Line label="Plano mensal" value={`${credits.contracted} horas`} />
              <Line label="Créditos disponíveis" value={`${available}h`} />
              <Line
                label="Situação financeira"
                value={pending.length ? "Pagamento pendente" : "Em dia"}
                tone={pending.length ? "amber" : "green"}
              />
            </div>
            {pending.length > 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-[12px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                Existe uma pendência financeira. Algumas funcionalidades poderão ficar limitadas caso o
                pagamento não seja regularizado.
              </div>
            )}
            <Button variant="soft" size="sm" className="mt-4 w-full" onClick={() => navigate("financial")}>
              Ver financeiro
            </Button>
          </Card>
        </div>
      </div>

      {/* chart */}
      <Card className="p-5">
        <SectionTitle
          title="Utilização mensal"
          subtitle="Comparativo entre horas contratadas, utilizadas e reservadas"
          icon={<Timer className="h-[18px] w-[18px]" />}
        />
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={usageByMonth} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-line" opacity={0.25} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  fontSize: 12.5,
                }}
                cursor={{ fill: "rgba(31,132,143,.08)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12.5, paddingTop: 8 }} />
              <Bar dataKey="contratadas" name="Contratadas" fill="#146485" radius={[6, 6, 0, 0]} />
              <Bar dataKey="utilizadas" name="Utilizadas" fill="#2fa37c" radius={[6, 6, 0, 0]} />
              <Bar dataKey="reservadas" name="Reservadas" fill="#7cc3ca" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* history */}
      <Card className="p-5">
        <SectionTitle title="Histórico de créditos" subtitle="Entradas e saídas do seu saldo" />
        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface-2/40 px-4 py-3 transition-colors hover:bg-surface-2"
            >
              <span
                className={cx(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  e.delta > 0 ? "bg-mint-50 text-mint-600 dark:bg-mint-500/15" : "bg-rose-50 text-rose-600 dark:bg-rose-500/15",
                )}
              >
                {e.delta > 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink">
                  {e.type === "reserva" ? "Reserva" : e.type === "cancelamento" ? "Cancelamento" : "Crédito"}
                  {e.room ? ` — ${e.room}` : ""}
                </p>
                <p className="text-[12.5px] text-muted">
                  {fmtDate(e.date)} · {e.description}
                </p>
              </div>
              <span
                className={cx(
                  "shrink-0 text-[14px] font-extrabold",
                  e.delta > 0 ? "text-mint-600" : "text-rose-600",
                )}
              >
                {e.delta > 0 ? "+" : ""}
                {e.delta}h
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-line bg-surface-2/50 p-3.5 text-[12.5px] text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <p>
            Cada hora reservada consome 1 crédito do seu pacote. Cancelamentos com mais de 24h devolvem o
            crédito integralmente.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2.5 last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span
        className={cx(
          "text-[13px] font-bold",
          tone === "green" ? "text-mint-600" : tone === "amber" ? "text-amber-600" : "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}
