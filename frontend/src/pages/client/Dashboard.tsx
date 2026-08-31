import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  FileText,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useApp } from "../../store";
import { fmtDate, fromISO, money, toISO } from "../../data/mock";
import {
  Alert,
  Badge,
  Button,
  Card,
  cx,
  ProgressBar,
  SectionTitle,
  StatusBadge,
  StatCard,
} from "../../components/ui";
import { ReservationDetailsModal } from "../../components/modals";
import type { Reservation } from "../../types";

export default function ClientDashboard() {
  const { navigate, reservations, credits, cancelReservation, payments: payState, currentClientId, me, clients, contracts } = useApp();
  const client = clients.find((c) => c.id === currentClientId) ?? {
    professionalName: me?.name ?? "Cliente",
    plan: me?.plan ?? "Plano",
  };
  const [detail, setDetail] = useState<Reservation | null>(null);

  const myReservations = reservations
    .filter((r) => r.clientId === currentClientId)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  const upcoming = useMemo(
    () =>
      myReservations.filter(
        (r) => ["confirmado", "solicitado"].includes(r.status) && fromISO(r.date).getTime() >= new Date().setHours(0, 0, 0, 0),
      ),
    [myReservations],
  );

  const next = upcoming[0];
  const myContracts = contracts.filter((c) => c.clientId === currentClientId);
  const mainContract = myContracts[0];
  const myPayments = payState.filter((p) => p.clientId === currentClientId);
  const pending = myPayments.filter((p) => p.status === "pendente" || p.status === "vencido");
  const overdue = myPayments.filter((p) => p.status === "vencido");
  const inAnalysis = myPayments.filter((p) => p.status === "em_analise");
  const daysToEnd = mainContract ? Math.ceil((fromISO(mainContract.end).getTime() - Date.now()) / 86400000) : 999;
  const cancelLeft = mainContract ? mainContract.cancelLimit - mainContract.cancelUsed : 99;

  const usedPct = credits.contracted ? Math.round((credits.used / credits.contracted) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-faint">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink sm:text-[28px]">
            Olá, {client.professionalName.split(" ").slice(0, 2).join(" ")}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Você tem {upcoming.length} atendimento(s) agendado(s) e {credits.available}h disponíveis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<FileText className="h-[18px] w-[18px]" />} onClick={() => navigate("contracts")}>
            Meus contratos
          </Button>
          <Button icon={<CalendarPlus className="h-[18px] w-[18px]" />} onClick={() => navigate("agenda")}>
            Reservar sala
          </Button>
        </div>
      </div>

      {/* alerts */}
      {(daysToEnd <= 7 || credits.available <= 5 || pending.length > 0 || cancelLeft <= 1) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {daysToEnd <= 7 && (
            <Alert kind="warning" title={`Seu contrato vence em ${daysToEnd} dias`}>
              Renove o plano {client.plan} para não perder seus horários reservados.
            </Alert>
          )}
          {credits.available <= 5 && (
            <Alert kind="warning" title="Você possui poucas horas disponíveis">
              Restam {credits.available}h do pacote de {credits.contracted}h deste mês.
            </Alert>
          )}
          {overdue.length > 0 && (
            <Alert kind="danger" title="Pagamento vencido">
              Sua mensalidade de {money(overdue[0].value)} venceu em {fmtDate(overdue[0].dueDate)}.
            </Alert>
          )}
          {mainContract && cancelLeft <= 1 && (
            <Alert kind="danger" title="Você está próximo do limite de cancelamentos">
              Você realizou {mainContract.cancelUsed} cancelamentos em cima da hora. Restam apenas{" "}
              {cancelLeft} ocorrência(s) disponível(eis) neste período.
            </Alert>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card hover className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                Créditos disponíveis
              </p>
              <p className="mt-2 text-[30px] font-extrabold leading-none tracking-tight text-ink">
                {credits.available}h
              </p>
              <p className="mt-1.5 text-[12.5px] text-muted">Disponíveis este mês</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <Timer className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4">
            <ProgressBar value={credits.used} max={credits.contracted} />
            <div className="mt-2 flex items-center justify-between text-[12px] font-semibold">
              <span className="text-muted">{credits.contracted}h contratadas</span>
              <span className="text-brand-600">{credits.used}h utilizadas</span>
            </div>
          </div>
        </Card>

        <Card hover className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                Próximo atendimento
              </p>
              {next ? (
                <>
                  <p className="mt-2 text-[22px] font-extrabold leading-none tracking-tight text-ink">
                    {next.date === toISO(new Date()) ? "Hoje" : fmtDate(next.date)}
                  </p>
                  <p className="mt-2 text-[15px] font-bold text-brand-600">
                    {next.start} — {next.end}
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted">{next.roomName}</p>
                  <div className="mt-2">
                    <StatusBadge status={next.status} />
                  </div>
                </>
              ) : (
                <p className="mt-2 text-[15px] font-semibold text-muted">Nenhum agendamento</p>
              )}
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-50 text-mint-600 dark:bg-mint-500/15 dark:text-mint-400">
              <CalendarClock className="h-5 w-5" />
            </span>
          </div>
          <Button
            variant="soft"
            size="sm"
            className="mt-4 w-full"
            onClick={() => (next ? setDetail(next) : navigate("agenda"))}
          >
            {next ? "Ver detalhes" : "Abrir agenda"}
          </Button>
        </Card>

        <StatCard
          label="Horas utilizadas"
          value={`${credits.used}h`}
          sub={`de ${credits.contracted}h do pacote mensal`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="mint"
          progress={usedPct}
        />

        <Card hover className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">Contrato</p>
              <p className="mt-2 text-[22px] font-extrabold leading-none tracking-tight text-mint-600">
                {mainContract ? (mainContract.status === "ativo" ? "Ativo" : "Atenção") : "Sem contrato"}
              </p>
              <p className="mt-2 text-[12.5px] text-muted">
                {mainContract ? (
                  <>
                    Válido até <strong className="text-ink">{fmtDate(mainContract.end)}</strong>
                  </>
                ) : (
                  "Nenhum contrato ativo"
                )}
              </p>
              {mainContract && (
                <p className="mt-1 text-[12.5px] text-muted">{mainContract.monthlyHours}h/mês · {money(mainContract.monthlyValue)}</p>
              )}
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <FileText className="h-5 w-5" />
            </span>
          </div>
          <Button variant="soft" size="sm" className="mt-4 w-full" onClick={() => navigate("contracts")}>
            Ver contrato
          </Button>
        </Card>
      </div>

      {/* second row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            title="Próximos atendimentos"
            subtitle="Seus horários confirmados e solicitações"
            icon={<CalendarClock className="h-[18px] w-[18px]" />}
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate("agenda")}>
                Ver agenda <ArrowUpRight className="h-4 w-4" />
              </Button>
            }
          />
          <div className="space-y-2.5">
            {upcoming.slice(0, 5).map((r) => (
              <button
                key={r.id}
                onClick={() => setDetail(r)}
                className={cx(
                  "flex w-full items-center gap-4 rounded-2xl border border-line bg-surface-2/40 p-3.5 text-left transition-all duration-200 hover:border-brand-300 hover:bg-surface-2",
                )}
              >
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-brand-600 text-white">
                  <span className="text-[13px] font-extrabold leading-none">{r.start.slice(0, 2)}</span>
                  <span className="text-[9.5px] font-semibold uppercase">{r.start.slice(3)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink">{r.roomName}</p>
                  <p className="text-[12.5px] text-muted">
                    {fmtDate(r.date)} · {r.hours}h de crédito
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </button>
            ))}
            {upcoming.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line bg-surface-2/40 px-4 py-8 text-center text-[13px] text-muted">
                Nenhum atendimento futuro. Que tal reservar uma sala?
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Cancelamentos restantes" icon={<AlertTriangle className="h-[18px] w-[18px]" />} />
            {mainContract ? (
              <>
                <div className="flex items-end gap-2">
                  <p className="text-[30px] font-extrabold leading-none text-ink">{cancelLeft}</p>
                  <p className="pb-1 text-[13px] text-muted">de {mainContract.cancelLimit} neste mês</p>
                </div>
                <div className="mt-3">
                  <ProgressBar value={mainContract.cancelUsed} max={mainContract.cancelLimit} tone="rose" />
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                  {cancelLeft <= 1
                    ? "Atenção: você está no limite de ocorrências deste ciclo."
                    : "Cancelamentos com mais de 24h devolvem o crédito integralmente."}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[13px] text-muted">Nenhum contrato ativo no momento.</p>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Situação financeira" icon={<Wallet className="h-[18px] w-[18px]" />} />
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-surface-2/50 px-3.5 py-2.5">
                <span className="text-[13px] text-muted">Status</span>
                <Badge tone={overdue.length ? "red" : pending.length ? "amber" : "green"} dot>
                  {overdue.length ? "Pagamento vencido" : pending.length ? "Pagamento pendente" : "Em dia"}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface-2/50 px-3.5 py-2.5">
                <span className="text-[13px] text-muted">Em aberto</span>
                <span className="text-[13px] font-bold text-ink">
                  {money(pending.reduce((s, p) => s + p.value, 0))}
                </span>
              </div>
              {inAnalysis.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  <Clock className="h-4 w-4" /> {inAnalysis.length} comprovante(s) em análise
                </div>
              )}
              <Button variant="soft" size="sm" className="w-full" onClick={() => navigate("financial")}>
                Ir para o financeiro
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* credit + plan relationship */}
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-5 sm:grid-cols-3 sm:gap-0">
          {[
            { label: "Plano mensal", value: `${credits.contracted} horas`, icon: <CheckCircle2 className="h-5 w-5" />, tone: "text-brand-600" },
            { label: "Créditos disponíveis", value: `${credits.available}h`, icon: <Timer className="h-5 w-5" />, tone: "text-mint-600" },
            {
              label: "Situação financeira",
              value: overdue.length ? "Pagamento vencido" : pending.length ? "Pagamento pendente" : "Em dia",
              icon: <Wallet className="h-5 w-5" />,
              tone: overdue.length ? "text-rose-600" : pending.length ? "text-amber-600" : "text-mint-600",
            },
          ].map((item, i) => (
            <div
              key={item.label}
              className={cx(
                "flex items-center gap-4 sm:px-6",
                i === 0 ? "sm:pl-0" : "sm:border-l sm:border-line",
              )}
            >
              <span className={cx("flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2", item.tone)}>
                {item.icon}
              </span>
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">{item.label}</p>
                <p className="text-[16px] font-extrabold text-ink">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
        {pending.length > 0 && (
          <div className="border-t border-line bg-amber-50/60 px-5 py-3.5 text-[12.5px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            Existe uma pendência financeira. Algumas funcionalidades poderão ficar limitadas caso o pagamento
            não seja regularizado.
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
