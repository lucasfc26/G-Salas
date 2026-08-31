import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  FileText,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useApp } from "../../store";
import { fmtDate, money, toISO } from "../../data/mock";
import {
  Alert,
  Avatar,
  Button,
  Card,
  ContractBadge,
  cx,
  ProgressBar,
  SectionTitle,
  StatusBadge,
  StatCard,
} from "../../components/ui";

const colors = ["#146485", "#2fa37c", "#7cc3ca", "#43a2ab", "#12516c", "#1c7fa3"];

export default function AdminDashboard() {
  const { navigate, payments: payState, contracts: contractState, reservations: resState, rooms, clients, usageByMonth } = useApp();
  const revenueSeries = usageByMonth.map((m) => ({
    label: m.label,
    faturamento: contractState.reduce((s, c) => s + c.monthlyValue, 0),
    recebido: payState.filter((p) => p.status === "pago" && p.paidAt?.startsWith(m.iso.slice(0, 7))).reduce((s, p) => s + p.value, 0),
  }));
  const occupancy = rooms.map((r) => {
    const hours = resState.filter((x) => x.roomId === r.id && x.status !== "cancelado").reduce((s, x) => s + x.hours, 0);
    return { name: r.name.split("—")[0].trim(), ocup: Math.min(100, Math.round((hours / 300) * 100)) };
  });
  const todayISO = toISO(new Date());
  const todayRes = resState
    .filter((r) => r.date === todayISO)
    .sort((a, b) => a.start.localeCompare(b.start));
  const pendingReceipts = payState.filter((p) => p.status === "em_analise");
  const overdue = payState.filter((p) => p.status === "vencido");
  const expiring = contractState.filter((c) => c.status === "vence_em_breve");
  const expired = contractState.filter((c) => c.status === "vencido");
  const activeClients = clients.filter((c) => c.status === "ativo").length;
  const hoursMonth = resState
    .filter((r) => r.date.slice(0, 7) === todayISO.slice(0, 7))
    .reduce((s, r) => s + r.hours, 0);
  const occupancyRate = rooms.length
    ? Math.round((hoursMonth / (rooms.length * 15 * 30)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-faint">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink sm:text-[28px]">
            Painel do gestor
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Visão geral de ocupação, clientes, contratos e financeiro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<Receipt className="h-[18px] w-[18px]" />} onClick={() => navigate("financial")}>
            Comprovantes ({pendingReceipts.length})
          </Button>
          <Button icon={<CalendarClock className="h-[18px] w-[18px]" />} onClick={() => navigate("schedule")}>
            Agenda geral
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Clientes ativos" value={activeClients} sub={`${clients.length} profissionais cadastrados`} icon={<Users className="h-5 w-5" />} tone="brand" />
        <StatCard label="Salas" value={rooms.length} sub={`${rooms.filter((r) => !r.blocked).length} disponíveis`} icon={<DoorOpen className="h-5 w-5" />} tone="mint" />
        <StatCard label="Horas alugadas (mês)" value={`${hoursMonth}h`} sub="Registradas neste mês" icon={<TrendingUp className="h-5 w-5" />} tone="violet" />
        <StatCard label="Faturamento" value={money(payState.filter((p) => p.status === "pago").reduce((s, p) => s + p.value, 0))} sub="Receita confirmada" icon={<Wallet className="h-5 w-5" />} tone="mint" />
        <StatCard label="Taxa de ocupação" value={`${occupancyRate}%`} sub="Calculada nas reservas do mês" icon={<CalendarClock className="h-5 w-5" />} tone="amber" progress={occupancyRate} />
      </div>

      {/* admin alerts */}
      <div className="grid gap-3 lg:grid-cols-3">
        {overdue.length > 0 && (
          <Alert kind="danger" title={`${overdue.length} pagamentos estão vencidos`}>
            {overdue.map((p) => p.clientName).join(", ")}.
          </Alert>
        )}
        {pendingReceipts.length > 0 && (
          <Alert kind="info" title={`Existem ${pendingReceipts.length} comprovantes aguardando análise`}>
            Acesse Financeiro → Comprovantes para aprovar ou recusar.
          </Alert>
        )}
        {(expiring.length > 0 || expired.length > 0) && (
          <Alert kind="warning" title={`${expiring.length + expired.length} contratos exigem atenção`}>
            {expiring.length} vencendo em breve e {expired.length} vencidos.
          </Alert>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            title="Faturamento e recebimento"
            subtitle="Últimos 6 meses"
            icon={<TrendingUp className="h-[18px] w-[18px]" />}
          />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#146485" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#146485" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2fa37c" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2fa37c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12.5 }}
                  formatter={(v) => money(Number(v))}
                />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#146485" fill="url(#g1)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="recebido" name="Recebido" stroke="#2fa37c" fill="url(#g2)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Ocupação por sala" icon={<DoorOpen className="h-[18px] w-[18px]" />} />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancy} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={64} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12.5 }}
                  formatter={(v) => `${Number(v)}%`}
                />
                <Bar dataKey="ocup" name="Ocupação" radius={[0, 6, 6, 0]}>
                  {occupancy.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            title="Agenda de hoje"
            subtitle={`${todayRes.length} atendimento(s) agendado(s)`}
            icon={<CalendarClock className="h-[18px] w-[18px]" />}
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate("schedule")}>
                Ver agenda geral
              </Button>
            }
          />
          <div className="space-y-2.5">
            {todayRes.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/40 p-3">
                <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-brand-600 text-white">
                  <span className="text-[12.5px] font-extrabold leading-none">{r.start.slice(0, 2)}</span>
                  <span className="text-[9px] font-semibold uppercase">{r.start.slice(3)}</span>
                </div>
                <Avatar name={r.clientName} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink">{r.clientName}</p>
                  <p className="truncate text-[12px] text-muted">
                    {r.roomName} · {r.hours}h
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
            {todayRes.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">
                Nenhuma reserva para hoje.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Contratos em atenção" icon={<FileText className="h-[18px] w-[18px]" />} />
          <div className="space-y-3">
            {[...expired, ...expiring].slice(0, 5).map((c) => (
              <button
                key={c.id}
                onClick={() => navigate("contracts")}
                className="w-full rounded-2xl border border-line bg-surface-2/40 p-3 text-left transition-colors hover:border-brand-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-bold text-ink">{c.clientName}</p>
                  <ContractBadge status={c.status} />
                </div>
                <p className="mt-1 truncate text-[12px] text-muted">{c.title}</p>
                <p className="mt-1 text-[11.5px] font-semibold text-faint">
                  Vence em {fmtDate(c.end)}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-muted">Cancelamentos do mês</span>
              <span className="font-bold text-ink">7</span>
            </div>
            <ProgressBar value={7} max={20} tone="rose" />
            <div className="flex items-center gap-2 rounded-xl bg-mint-50 px-3 py-2.5 text-[12px] font-semibold text-mint-700 dark:bg-mint-500/10 dark:text-mint-300">
              <CheckCircle2 className="h-4 w-4" /> {payState.filter((p) => p.status === "pago").length} pagamentos confirmados
            </div>
          </div>
        </Card>
      </div>

      {/* quick clients */}
      <Card className="p-5">
        <SectionTitle
          title="Clientes em destaque"
          subtitle="Consumo de horas do plano"
          icon={<Users className="h-[18px] w-[18px]" />}
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate("clients")}>
              Ver todos
            </Button>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {clients.map((c) => {
            const pct = c.monthlyHours ? Math.round((c.usedHours / c.monthlyHours) * 100) : 0;
            return (
              <button
                key={c.id}
                onClick={() => navigate("clients", c.id)}
                className="rounded-2xl border border-line p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.name} size={36} color={c.color} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-ink">{c.name}</p>
                    <p className="truncate text-[11.5px] text-faint">{c.plan}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11.5px] font-semibold">
                  <span className="text-muted">{c.usedHours}h / {c.monthlyHours}h</span>
                  <span className={cx(pct > 80 ? "text-rose-600" : "text-mint-600")}>{pct}%</span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar value={pct} tone={pct > 80 ? "rose" : "mint"} height={6} />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: <AlertTriangle className="h-5 w-5" />, t: "Sala 06 bloqueada", d: "Manutenção da cabine de atendimento online.", tone: "warning" as const },
          { icon: <Receipt className="h-5 w-5" />, t: `${pendingReceipts.length} comprovantes`, d: "Aguardando conferência da administração.", tone: "info" as const },
          { icon: <FileText className="h-5 w-5" />, t: "Renovações em andamento", d: "1 contrato em processo de renovação.", tone: "success" as const },
        ].map((a) => (
          <Alert key={a.t} kind={a.tone} title={a.t}>
            {a.d}
          </Alert>
        ))}
      </div>
    </div>
  );
}
