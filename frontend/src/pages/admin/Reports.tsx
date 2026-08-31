import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarClock, Download, PieChart as PieIcon, TrendingUp, Users, XCircle } from "lucide-react";
import { useApp } from "../../store";
import { money, monthShort } from "../../data/mock";
import { Avatar, Button, Card, cx, ProgressBar, SectionTitle, StatCard } from "../../components/ui";

const pieColors = ["#146485", "#2fa37c", "#7cc3ca", "#f59e0b", "#e11d48"];

export default function Reports() {
  const { reservations, toast, rooms, clients, usageByMonth } = useApp();

  const statusData = (["confirmado", "concluido", "solicitado", "cancelado", "nao_compareceu"] as const).map((s) => ({
    name: s === "nao_compareceu" ? "Faltas" : s.charAt(0).toUpperCase() + s.slice(1),
    value: reservations.filter((r) => r.status === s).length,
  }));

  const hoursByRoom = rooms.map((r) => ({
    name: r.name.split("—")[0].trim(),
    horas: reservations.filter((x) => x.roomId === r.id).reduce((s, x) => s + x.hours, 0),
  }));

  const topClients = clients
    .map((c) => ({
      ...c,
      hours: reservations.filter((r) => r.clientId === c.id).reduce((s, r) => s + r.hours, 0),
      cancellations: reservations.filter(
        (r) => r.clientId === c.id && (r.status === "cancelado" || r.status === "nao_compareceu"),
      ).length,
    }))
    .sort((a, b) => b.hours - a.hours);

  const cancelSeries = usageByMonth.map((m) => ({
    label: m.label,
    cancelamentos: Math.round(m.utilizadas / 6) + 1,
  }));

  const totalHours = reservations.reduce((s, r) => s + r.hours, 0);
  const cancelRate = reservations.length
    ? Math.round((reservations.filter((r) => r.status === "cancelado").length / reservations.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Relatórios</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Indicadores de ocupação, cancelamentos e desempenho por cliente.
          </p>
        </div>
        <Button variant="outline" icon={<Download className="h-[18px] w-[18px]" />} onClick={() => toast("Exportação", "Relatório exportado em PDF (simulado).", "success")}>
          Exportar relatório
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Horas totalizadas" value={`${totalHours}h`} sub="Base histórica de reservas" icon={<CalendarClock className="h-5 w-5" />} tone="brand" />
        <StatCard label="Ticket médio" value={money(760)} sub="Valor médio por cliente/mês" icon={<TrendingUp className="h-5 w-5" />} tone="mint" />
        <StatCard label="Taxa de cancelamento" value={`${cancelRate}%`} sub="Reservas canceladas" icon={<XCircle className="h-5 w-5" />} tone="rose" />
        <StatCard label="Clientes ativos" value={clients.filter((c) => c.status === "ativo").length} sub="Com contrato vigente" icon={<Users className="h-5 w-5" />} tone="violet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Horas por sala" subtitle="Consumo acumulado por espaço" icon={<TrendingUp className="h-[18px] w-[18px]" />} />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByRoom} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12.5 }} />
                <Bar dataKey="horas" name="Horas" fill="#146485" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Status das reservas" icon={<PieIcon className="h-[18px] w-[18px]" />} />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={3}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12.5 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Cancelamentos por mês" subtitle="Evolução das ocorrências" icon={<XCircle className="h-[18px] w-[18px]" />} />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cancelSeries} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12.5 }} />
                <Line type="monotone" dataKey="cancelamentos" name="Cancelamentos" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Ranking de clientes" subtitle="Horas consumidas e cancelamentos" icon={<Users className="h-[18px] w-[18px]" />} />
          <div className="space-y-3">
            {topClients.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className={cx("flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-extrabold", i === 0 ? "bg-brand-600 text-white" : "bg-surface-2 text-muted")}>
                  {i + 1}
                </span>
                <Avatar name={c.name} size={34} color={c.color} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-[13px] font-bold text-ink">{c.name}</p>
                    <span className="text-[12.5px] font-bold text-ink">{c.hours}h</span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={c.hours} max={Math.max(...topClients.map((x) => x.hours))} height={5} tone={i === 0 ? "brand" : "mint"} />
                  </div>
                </div>
                <span className="w-14 text-right text-[11.5px] font-semibold text-faint">
                  {c.cancellations} canc.
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title="Resumo do período" subtitle={`${monthShort(usageByMonth[0].iso)} a ${monthShort(usageByMonth[usageByMonth.length - 1].iso)}`} icon={<CalendarClock className="h-[18px] w-[18px]" />} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "Horas contratadas", v: usageByMonth.reduce((s, m) => s + m.contratadas, 0) + "h" },
            { l: "Horas utilizadas", v: usageByMonth.reduce((s, m) => s + m.utilizadas, 0) + "h" },
            { l: "Horas reservadas", v: usageByMonth.reduce((s, m) => s + m.reservadas, 0) + "h" },
            { l: "Reservas registradas", v: String(reservations.length) },
          ].map((i) => (
            <div key={i.l} className="rounded-2xl border border-line bg-surface-2/40 p-4">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">{i.l}</p>
              <p className="mt-1 text-[20px] font-extrabold text-ink">{i.v}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
