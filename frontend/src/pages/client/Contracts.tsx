import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Info,
  RefreshCw,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useApp } from "../../store";
import { daysBetween, fmtDate, money, toISO } from "../../data/mock";
import {
  Alert,
  Badge,
  Button,
  Card,
  ContractBadge,
  cx,
  EmptyState,
  Modal,
  ProgressBar,
  SectionTitle,
} from "../../components/ui";
import { Row } from "../../components/modals";
import type { Contract } from "../../types";

const statusTheme: Record<Contract["status"], { ring: string; icon: React.ReactNode; soft: string }> = {
  ativo: {
    ring: "border-l-mint-500",
    icon: <CheckCircle2 className="h-5 w-5 text-mint-600" />,
    soft: "bg-mint-50 text-mint-700 dark:bg-mint-500/10 dark:text-mint-300",
  },
  vence_em_breve: {
    ring: "border-l-amber-500",
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    soft: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  vencido: {
    ring: "border-l-rose-500",
    icon: <AlertTriangle className="h-5 w-5 text-rose-600" />,
    soft: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  },
  renovacao: {
    ring: "border-l-brand-500",
    icon: <RefreshCw className="h-5 w-5 text-brand-600" />,
    soft: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
  },
};

export default function Contracts() {
  const { contracts: state, toast, navigate, currentClientId } = useApp();
  const [detail, setDetail] = useState<Contract | null>(null);
  const mine = state.filter((c) => c.clientId === currentClientId);
  const main = mine[0];
  const days = main ? daysBetween(toISO(new Date()), main.end) : 0;

  const financialMessage = (c: Contract) => {
    if (c.financial === "em_dia")
      return { label: "Em dia", tone: "green" as const, msg: "Nenhuma pendência financeira para este contrato." };
    if (c.financial === "pendente")
      return { label: "Pagamento pendente", tone: "amber" as const, msg: "Existe uma cobrança em aberto vinculada ao contrato." };
    return { label: "Pagamento vencido", tone: "red" as const, msg: "Regularize o pagamento para manter o contrato ativo." };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Meus contratos</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Vigência, horas contratadas e situação financeira de cada plano.
          </p>
        </div>
        <Button
          variant="outline"
          icon={<RefreshCw className="h-[18px] w-[18px]" />}
          onClick={() => toast("Renovação solicitada", "A administração foi notificada sobre o interesse na renovação.", "success")}
        >
          Solicitar renovação
        </Button>
      </div>

      {/* status alerts */}
      <div className="space-y-3">
        {main?.status === "vence_em_breve" && (
          <Alert kind="warning" title="Seu contrato está próximo do vencimento.">
            O plano {main.monthlyHours}h vence em {fmtDate(main.end)} ({days} dias).
          </Alert>
        )}
        {main?.status === "vencido" && (
          <Alert kind="danger" title="Seu contrato venceu.">
            Entre em contato com a administração para renovar e voltar a reservar suas salas.
          </Alert>
        )}
        {main && main.financial !== "em_dia" && main.status === "ativo" && (
          <Alert kind="warning" title="Contrato ativo com pendência financeira">
            Seu contrato está ativo, mas existe uma cobrança {main.financial === "vencido" ? "vencida" : "pendente"}.
          </Alert>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {mine.map((c) => {
          const th = statusTheme[c.status];
          const fin = financialMessage(c);
          const remain = daysBetween(toISO(new Date()), c.end);
          return (
            <Card key={c.id} hover className={cx("overflow-hidden border-l-4 p-5", th.ring)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={cx("flex h-10 w-10 items-center justify-center rounded-xl", th.soft)}>
                    {th.icon}
                  </span>
                  <div>
                    <h3 className="text-[14.5px] font-bold leading-snug text-ink">{c.title}</h3>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {fmtDate(c.start)} → {fmtDate(c.end)}
                    </p>
                  </div>
                </div>
                <ContractBadge status={c.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-2/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                    Horas contratadas
                  </p>
                  <p className="mt-0.5 text-[16px] font-extrabold text-ink">{c.monthlyHours}h/mês</p>
                </div>
                <div className="rounded-xl bg-surface-2/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Mensalidade</p>
                  <p className="mt-0.5 text-[16px] font-extrabold text-ink">{money(c.monthlyValue)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
                <span className="flex items-center gap-2 text-[12.5px] text-muted">
                  <ShieldCheck className="h-4 w-4" /> Situação financeira
                </span>
                <Badge tone={fin.tone} dot>
                  {fin.label}
                </Badge>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[11.5px] font-semibold text-faint">
                  <span>Cancelamentos: {c.cancelUsed}/{c.cancelLimit}</span>
                  <span>{remain > 0 ? `${remain} dias restantes` : "Encerrado"}</span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar value={c.cancelUsed} max={c.cancelLimit} height={6} tone="rose" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="soft" icon={<Eye className="h-4 w-4" />} onClick={() => setDetail(c)}>
                  Detalhes
                </Button>
                <Button size="sm" variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => toast("Download iniciado", c.pdf ?? "Contrato", "info")}>
                  Baixar contrato
                </Button>
                <Button size="sm" variant="ghost" icon={<FileText className="h-4 w-4" />} onClick={() => navigate("financial")}>
                  Financeiro
                </Button>
              </div>
            </Card>
          );
        })}
        {mine.length === 0 && (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Nenhum contrato"
            message="Você ainda não possui contratos cadastrados."
          />
        )}
      </div>

      {/* rules */}
      <Card className="p-5">
        <SectionTitle
          title="Política de cancelamento e remarcação"
          subtitle="Como os créditos são tratados em cada situação"
          icon={<Info className="h-[18px] w-[18px]" />}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Mais de 24 horas",
              tone: "green",
              icon: <CheckCircle2 className="h-5 w-5" />,
              text: "Crédito devolvido integralmente na sua conta.",
            },
            {
              title: "Menos de 24 horas",
              tone: "amber",
              icon: <AlertTriangle className="h-5 w-5" />,
              text: "Crédito pode ser perdido, conforme disponibilidade.",
            },
            {
              title: "Em cima da hora",
              tone: "red",
              icon: <Timer className="h-5 w-5" />,
              text: "Contabilizado como ocorrência no seu limite mensal.",
            },
          ].map((r) => (
            <div
              key={r.title}
              className={cx(
                "rounded-2xl border p-4",
                r.tone === "green"
                  ? "border-mint-500/25 bg-mint-50/60 dark:bg-mint-500/10"
                  : r.tone === "amber"
                    ? "border-amber-500/25 bg-amber-50/60 dark:bg-amber-500/10"
                    : "border-rose-500/25 bg-rose-50/60 dark:bg-rose-500/10",
              )}
            >
              <span
                className={cx(
                  "flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 dark:bg-white/10",
                  r.tone === "green" ? "text-mint-600" : r.tone === "amber" ? "text-amber-600" : "text-rose-600",
                )}
              >
                {r.icon}
              </span>
              <p className="mt-3 text-[13.5px] font-bold text-ink">{r.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{r.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-surface-2/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarClock className="h-5 w-5 text-brand-600" />
              <div>
                <p className="text-[13.5px] font-bold text-ink">Cancelamentos restantes</p>
                <p className="text-[12.5px] text-muted">
                  {main ? `${main.cancelUsed} de ${main.cancelLimit} utilizados este mês` : "Nenhum contrato ativo"}
                </p>
              </div>
            </div>
            {main && (
              <Badge tone={main.cancelLimit - main.cancelUsed <= 1 ? "red" : "amber"}>
                {main.cancelLimit - main.cancelUsed} restante(s)
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title ?? ""}
        subtitle="Detalhes do contrato"
        size="md"
        icon={<FileText className="h-5 w-5" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetail(null)}>
              Fechar
            </Button>
            <Button onClick={() => toast("Download iniciado", detail?.pdf ?? "Contrato", "info")} icon={<Download className="h-4 w-4" />}>
              Baixar contrato
            </Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ContractBadge status={detail.status} />
              <Badge tone={financialMessage(detail).tone} dot>
                {financialMessage(detail).label}
              </Badge>
            </div>
            <Card className="p-4">
              <Row label="Vigência" value={`${fmtDate(detail.start)} → ${fmtDate(detail.end)}`} />
              <Row label="Horas contratadas" value={`${detail.monthlyHours}h/mês`} />
              <Row label="Mensalidade" value={money(detail.monthlyValue)} />
              <Row label="Limite de cancelamentos" value={`${detail.cancelLimit} por mês`} />
              <Row label="Cancelamentos utilizados" value={`${detail.cancelUsed}`} />
              <Row label="Regra" value={<span className="text-right text-[12.5px] font-medium">{detail.cancelRule}</span>} />
            </Card>
            <Alert kind={financialMessage(detail).tone === "green" ? "success" : "warning"} title={financialMessage(detail).label}>
              {financialMessage(detail).msg}
            </Alert>
          </div>
        )}
      </Modal>
    </div>
  );
}
