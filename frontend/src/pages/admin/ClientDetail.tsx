import { useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  Phone,
  Star,
  Timer,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { useApp } from "../../store";
import { fmtDate, money, toISO } from "../../data/mock";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  ContractBadge,
  cx,
  PaymentBadge,
  ProgressBar,
  SectionTitle,
  StatusBadge,
  StatCard,
} from "../../components/ui";
import { Row } from "../../components/modals";

const tabs = [
  { key: "perfil", label: "Perfil", icon: <User className="h-4 w-4" /> },
  { key: "contratos", label: "Contratos", icon: <FileText className="h-4 w-4" /> },
  { key: "reservas", label: "Reservas", icon: <CalendarClock className="h-4 w-4" /> },
  { key: "creditos", label: "Horas utilizadas", icon: <Timer className="h-4 w-4" /> },
  { key: "cancelamentos", label: "Cancelamentos", icon: <XCircle className="h-4 w-4" /> },
  { key: "financeiro", label: "Financeiro", icon: <Wallet className="h-4 w-4" /> },
];

export default function ClientDetail({ clientId }: { clientId: string }) {
  const { navigate, reservations: resState, payments: payState, contracts: contractState, clients } = useApp();
  const [tab, setTab] = useState("perfil");
  const client = clients.find((c) => c.id === clientId);

  if (!client) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate("clients")}>
          Voltar para clientes
        </Button>
        <Card className="p-10 text-center text-[13px] text-muted">Cliente não encontrado.</Card>
      </div>
    );
  }

  const res = resState.filter((r) => r.clientId === client.id).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const pay = payState.filter((p) => p.clientId === client.id).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const cts = contractState.filter((c) => c.clientId === client.id);
  const main = cts[0];
  const todayISO = toISO(new Date());
  const monthRes = res.filter((r) => r.date.slice(0, 7) === todayISO.slice(0, 7));
  const usedHours = monthRes.filter((r) => r.status !== "cancelado").reduce((s, r) => s + r.hours, 0);
  const cancellations = res.filter((r) => r.status === "cancelado" || r.status === "nao_compareceu");
  const openPayments = pay.filter((p) => p.status === "pendente" || p.status === "vencido");

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate("clients")}>
        Voltar para clientes
      </Button>

      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar name={client.name} size={80} color={client.color} ring />
              <div className="pb-1">
                <h1 className="text-[20px] font-extrabold tracking-tight text-ink">{client.name}</h1>
                <p className="text-[13px] text-muted">
                  {client.profession} · {client.registry}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {main && <ContractBadge status={main.status} />}
              <Badge tone={client.status === "ativo" ? "green" : "slate"} dot>
                {client.status}
              </Badge>
              <Badge tone="brand">{client.plan}</Badge>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info icon={<Mail className="h-4 w-4" />} label="E-mail" value={client.email} />
            <Info icon={<Phone className="h-4 w-4" />} label="WhatsApp" value={client.whatsapp} />
            <Info icon={<MapPin className="h-4 w-4" />} label="Cidade" value={client.city} />
            <Info icon={<Star className="h-4 w-4" />} label="Cliente desde" value={fmtDate(client.joinedAt)} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Horas contratadas" value={`${client.monthlyHours}h`} sub="Pacote mensal" icon={<Timer className="h-5 w-5" />} tone="brand" />
        <StatCard label="Horas utilizadas" value={`${usedHours}h`} sub={`${Math.round((usedHours / client.monthlyHours) * 100)}% do pacote`} icon={<CreditCard className="h-5 w-5" />} tone="mint" progress={Math.round((usedHours / client.monthlyHours) * 100)} />
        <StatCard label="Reservas" value={res.length} sub={`${monthRes.length} neste mês`} icon={<CalendarClock className="h-5 w-5" />} tone="violet" />
        <StatCard label="Em aberto" value={money(openPayments.reduce((s, p) => s + p.value, 0))} sub={`${openPayments.length} cobrança(s)`} icon={<Wallet className="h-5 w-5" />} tone={openPayments.length ? "amber" : "mint"} />
      </div>

      {openPayments.length > 0 && (
        <Alert kind="warning" title="Cliente com pendência financeira">
          Existem {openPayments.length} cobrança(s) em aberto totalizando{" "}
          {money(openPayments.reduce((s, p) => s + p.value, 0))}.
        </Alert>
      )}
      {main && main.cancelUsed >= main.cancelLimit && (
        <Alert kind="danger" title="Limite de cancelamentos atingido">
          {client.name} utilizou {main.cancelUsed} de {main.cancelLimit} cancelamentos permitidos neste ciclo.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cx(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors",
                tab === t.key ? "bg-brand-600 text-white" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </Card>

        <div className="space-y-4">
          {tab === "perfil" && (
            <Card className="p-5">
              <SectionTitle title="Dados cadastrais" subtitle="Informações pessoais e profissionais" icon={<User className="h-[18px] w-[18px]" />} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-4">
                  <Row label="Nome completo" value={client.name} />
                  <Row label="Nome profissional" value={client.professionalName} />
                  <Row label="CPF" value={client.document} />
                  <Row label="Nascimento" value={fmtDate(client.birthDate)} />
                  <Row label="E-mail" value={client.email} />
                  <Row label="Telefone" value={client.phone} />
                </Card>
                <Card className="p-4">
                  <Row label="Profissão" value={client.profession} />
                  <Row label="Registro" value={client.registry} />
                  <Row label="Modalidade" value={<span className="capitalize">{client.modality}</span>} />
                  <Row label="Cidade" value={client.city} />
                  <Row label="Plano" value={client.plan} />
                  <Row
                    label="Especialidades"
                    value={<span className="text-right text-[12.5px] font-medium">{client.specialties.join(", ")}</span>}
                  />
                </Card>
              </div>
            </Card>
          )}

          {tab === "contratos" && (
            <div className="space-y-3">
              {cts.map((c) => (
                <Card key={c.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[14.5px] font-bold text-ink">{c.title}</h3>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        {fmtDate(c.start)} → {fmtDate(c.end)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ContractBadge status={c.status} />
                      <Badge tone={c.financial === "em_dia" ? "green" : c.financial === "vencido" ? "red" : "amber"} dot>
                        {c.financial === "em_dia" ? "Em dia" : c.financial === "vencido" ? "Vencido" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-surface-2/60 p-3">
                      <p className="text-[11px] uppercase text-faint">Horas</p>
                      <p className="text-[15px] font-extrabold text-ink">{c.monthlyHours}h/mês</p>
                    </div>
                    <div className="rounded-xl bg-surface-2/60 p-3">
                      <p className="text-[11px] uppercase text-faint">Valor</p>
                      <p className="text-[15px] font-extrabold text-ink">{money(c.monthlyValue)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2/60 p-3">
                      <p className="text-[11px] uppercase text-faint">Cancelamentos</p>
                      <p className="text-[15px] font-extrabold text-ink">
                        {c.cancelUsed}/{c.cancelLimit}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {tab === "reservas" && (
            <Card className="p-5">
              <SectionTitle title="Reservas" subtitle={`${res.length} registro(s)`} icon={<CalendarClock className="h-[18px] w-[18px]" />} />
              <div className="space-y-2">
                {res.slice(0, 14).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
                    <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-brand-600 text-white">
                      <span className="text-[12.5px] font-extrabold leading-none">{r.start.slice(0, 2)}</span>
                      <span className="text-[9px] font-semibold uppercase">{r.start.slice(3)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink">{r.roomName}</p>
                      <p className="text-[12px] text-muted">
                        {fmtDate(r.date)} · {r.hours}h · {r.modality}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === "creditos" && (
            <Card className="p-5">
              <SectionTitle title="Consumo de horas" subtitle="Comparativo com o pacote contratado" icon={<Timer className="h-[18px] w-[18px]" />} />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-surface-2/60 p-4">
                  <p className="text-[11.5px] uppercase text-faint">Contratadas</p>
                  <p className="text-[24px] font-extrabold text-ink">{client.monthlyHours}h</p>
                </div>
                <div className="rounded-2xl bg-surface-2/60 p-4">
                  <p className="text-[11.5px] uppercase text-faint">Utilizadas</p>
                  <p className="text-[24px] font-extrabold text-brand-600">{usedHours}h</p>
                </div>
                <div className="rounded-2xl bg-surface-2/60 p-4">
                  <p className="text-[11.5px] uppercase text-faint">Disponíveis</p>
                  <p className="text-[24px] font-extrabold text-mint-600">{Math.max(client.monthlyHours - usedHours, 0)}h</p>
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar value={usedHours} max={client.monthlyHours} height={10} />
              </div>
              <div className="mt-5">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">
                  Reservas do mês
                </p>
                <div className="space-y-2">
                  {monthRes.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
                      <span className="text-[12.5px] text-muted">
                        {fmtDate(r.date)} · {r.start}—{r.end}
                      </span>
                      <span className="text-[12.5px] font-bold text-ink">-{r.hours}h</span>
                    </div>
                  ))}
                  {monthRes.length === 0 && <p className="text-[13px] text-muted">Nenhuma reserva neste mês.</p>}
                </div>
              </div>
            </Card>
          )}

          {tab === "cancelamentos" && (
            <Card className="p-5">
              <SectionTitle
                title="Cancelamentos e faltas"
                subtitle={`${main?.cancelUsed ?? 0} de ${main?.cancelLimit ?? 0} ocorrências utilizadas`}
                icon={<XCircle className="h-[18px] w-[18px]" />}
              />
              <div className="mb-4">
                <ProgressBar value={main?.cancelUsed ?? 0} max={main?.cancelLimit ?? 1} tone="rose" />
              </div>
              <div className="space-y-2">
                {cancellations.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15">
                      <XCircle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink">{r.roomName}</p>
                      <p className="text-[12px] text-muted">
                        {fmtDate(r.date)} às {r.start} · {r.hours}h
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
                {cancellations.length === 0 && <p className="text-[13px] text-muted">Nenhuma ocorrência registrada.</p>}
              </div>
            </Card>
          )}

          {tab === "financeiro" && (
            <Card className="p-5">
              <SectionTitle title="Histórico financeiro" subtitle="Cobranças e comprovantes" icon={<Wallet className="h-[18px] w-[18px]" />} />
              <div className="space-y-2">
                {pay.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-ink">{p.competence}</p>
                      <p className="text-[12px] text-muted">
                        Vence em {fmtDate(p.dueDate)}
                        {p.paidAt ? ` · pago em ${fmtDate(p.paidAt)}` : ""}
                      </p>
                    </div>
                    <span className="text-[13.5px] font-extrabold text-ink">{money(p.value)}</span>
                    <PaymentBadge status={p.status} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/40 px-3.5 py-2.5">
      <span className="text-brand-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-faint">{label}</p>
        <p className="truncate text-[12.5px] font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}
