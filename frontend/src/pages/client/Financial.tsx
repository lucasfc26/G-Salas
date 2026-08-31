import { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  Receipt,
  UploadCloud,
  Wallet,
} from "lucide-react";
import { useApp } from "../../store";
import { fmtDate, money, toISO } from "../../data/mock";
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Modal,
  PaymentBadge,
  SectionTitle,
  Select,
  StatCard,
  cx,
} from "../../components/ui";
import { ReceiptModal, Row } from "../../components/modals";
import type { Payment, PaymentStatus } from "../../types";

const filterList: (PaymentStatus | "todos")[] = ["todos", "pendente", "em_analise", "pago", "recusado", "vencido"];

const toneCard: Record<PaymentStatus, { bar: string; soft: string }> = {
  pendente: { bar: "border-l-amber-500", soft: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  em_analise: { bar: "border-l-violet-500", soft: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" },
  pago: { bar: "border-l-mint-500", soft: "bg-mint-50 text-mint-700 dark:bg-mint-500/10 dark:text-mint-300" },
  recusado: { bar: "border-l-rose-500", soft: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
  vencido: { bar: "border-l-rose-600", soft: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
};

export default function Financial() {
  const { payments, toast, credits, currentClientId } = useApp();
  const [status, setStatus] = useState<PaymentStatus | "todos">("todos");
  const [period, setPeriod] = useState("12");
  const [receiptFor, setReceiptFor] = useState<Payment | null>(null);
  const [detail, setDetail] = useState<Payment | null>(null);

  const mine = payments.filter((p) => p.clientId === currentClientId);
  const open = mine.filter((p) => p.status === "pendente" || p.status === "vencido");
  const overdue = mine.filter((p) => p.status === "vencido");
  const paidThisMonth = mine.filter(
    (p) => p.status === "pago" && p.paidAt && p.paidAt.slice(0, 7) === toISO(new Date()).slice(0, 7),
  );
  const nextDue = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const inAnalysis = mine.filter((p) => p.status === "em_analise");
  const rejected = mine.filter((p) => p.status === "recusado");

  const history = useMemo(
    () =>
      mine
        .filter((p) => (status === "todos" ? true : p.status === status))
        .filter((p) => {
          if (period === "all") return true;
          const min = new Date();
          min.setMonth(min.getMonth() - Number(period));
          return p.dueDate >= toISO(min);
        })
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    [mine, status, period],
  );

  const regular = overdue.length === 0 && open.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Financeiro</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Acompanhe suas mensalidades, comprovantes e histórico de pagamentos.
          </p>
        </div>
        <Badge tone={regular ? "green" : overdue.length ? "red" : "amber"} dot>
          Situação: {regular ? "Regular" : overdue.length ? "Vencido" : "Pendente"}
        </Badge>
      </div>

      {inAnalysis.length > 0 && (
        <Alert kind="info" title="Seu pagamento está em análise">
          {inAnalysis.length} comprovante(s) enviado(s). A administração confirmará em breve.
        </Alert>
      )}
      {rejected.map((p) => (
        <Alert key={p.id} kind="danger" title="Seu comprovante foi recusado">
          {p.rejectionReason}
        </Alert>
      ))}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Em aberto"
          value={money(open.reduce((s, p) => s + p.value, 0))}
          sub={`${open.length} cobrança(s)`}
          icon={<Wallet className="h-5 w-5" />}
          tone={open.length ? "amber" : "mint"}
        />
        <StatCard
          label="Pago este mês"
          value={money(paidThisMonth.reduce((s, p) => s + p.value, 0))}
          sub="Pagamentos confirmados"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="mint"
        />
        <StatCard
          label="Próximo vencimento"
          value={nextDue ? fmtDate(nextDue.dueDate) : "—"}
          sub={nextDue ? money(nextDue.value) : "Nada em aberto"}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Plano atual"
          value={`${credits.contracted}h`}
          sub={`${credits.available}h disponíveis`}
          icon={<CreditCard className="h-5 w-5" />}
          tone="violet"
          progress={Math.round((credits.used / credits.contracted) * 100)}
        />
      </div>

      {/* pending */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="h-[18px] w-[18px] text-brand-600" />
          <h2 className="text-[16px] font-bold tracking-tight text-ink">Pagamentos pendentes</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {open.map((p) => (
            <Card key={p.id} hover className={cx("border-l-4 p-5", toneCard[p.status].bar)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[14.5px] font-bold text-ink">Aluguel de salas — {p.competence}</h3>
                  <p className="mt-0.5 text-[12.5px] text-muted">{p.description}</p>
                </div>
                <PaymentBadge status={p.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-2/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Valor</p>
                  <p className="mt-0.5 text-[20px] font-extrabold text-ink">{money(p.value)}</p>
                </div>
                <div className="rounded-xl bg-surface-2/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Vencimento</p>
                  <p className="mt-0.5 text-[16px] font-extrabold text-ink">{fmtDate(p.dueDate)}</p>
                </div>
              </div>
              {p.status === "vencido" && (
                <p className="mt-3 text-[12.5px] font-semibold text-rose-600">Esta cobrança está vencida.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  icon={<UploadCloud className="h-4 w-4" />}
                  onClick={() => setReceiptFor(p)}
                >
                  {p.status === "vencido" ? "Regularizar pagamento" : "Anexar comprovante"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Copy className="h-4 w-4" />}
                  onClick={() => {
                    navigator.clipboard?.writeText("pagamentos@espacovital.com.br");
                    toast("Chave Pix copiada", "pagamentos@espacovital.com.br", "success");
                  }}
                >
                  Copiar chave Pix
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDetail(p)}>
                  Ver detalhes
                </Button>
              </div>
            </Card>
          ))}
          {open.length === 0 && (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Nenhuma pendência"
              message="Todas as suas cobranças estão quitadas. Situação financeira regular."
            />
          )}
        </div>
      </div>

      {/* history */}
      <Card className="p-5">
        <SectionTitle
          title="Histórico de pagamentos"
          subtitle="Competências, vencimentos e status"
          icon={<FileText className="h-[18px] w-[18px]" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[150px]">
                <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option value="6">Últimos 6 meses</option>
                  <option value="12">Últimos 12 meses</option>
                  <option value="all">Todos</option>
                </Select>
              </div>
            </div>
          }
        />
        <div className="mb-4 flex flex-wrap gap-2">
          {filterList.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "todos" ? "Todos" : s === "em_analise" ? "Em análise" : s === "recusado" ? "Recusados" : s === "vencido" ? "Vencidos" : s === "pago" ? "Pagos" : "Pendentes"}
            </Chip>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-2/50 text-left">
                {["Competência", "Valor", "Vencimento", "Pagamento", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide text-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/60">
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-ink">{p.competence}</td>
                  <td className="px-4 py-3.5 text-[13px] font-bold text-ink">{money(p.value)}</td>
                  <td className="px-4 py-3.5 text-[13px] text-muted">{fmtDate(p.dueDate)}</td>
                  <td className="px-4 py-3.5 text-[13px] text-muted">{p.paidAt ? fmtDate(p.paidAt) : "—"}</td>
                  <td className="px-4 py-3.5">
                    <PaymentBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button onClick={() => setDetail(p)} className="text-[12px] font-semibold text-brand-600 hover:underline">
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-line md:hidden">
          {history.map((p) => (
            <button key={p.id} onClick={() => setDetail(p)} className="w-full p-4 text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-bold text-ink">{p.competence}</p>
                  <p className="text-[12.5px] text-muted">Vence em {fmtDate(p.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-extrabold text-ink">{money(p.value)}</p>
                  <div className="mt-1">
                    <PaymentBadge status={p.status} />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {history.length === 0 && (
          <EmptyState icon={<FileText className="h-6 w-6" />} title="Sem registros" message="Nenhum pagamento encontrado para os filtros aplicados." />
        )}
      </Card>

      <ReceiptModal open={!!receiptFor} onClose={() => setReceiptFor(null)} payment={receiptFor} />

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Aluguel de salas — ${detail.competence}` : ""}
        subtitle="Detalhes da cobrança"
        icon={<FileText className="h-5 w-5" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetail(null)}>
              Fechar
            </Button>
            {detail && detail.status !== "pago" && (
              <Button icon={<UploadCloud className="h-4 w-4" />} onClick={() => { setReceiptFor(detail); setDetail(null); }}>
                Anexar comprovante
              </Button>
            )}
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <PaymentBadge status={detail.status} />
              <Badge tone="slate">{detail.method}</Badge>
            </div>
            <Card className="p-4">
              <Row label="Valor" value={money(detail.value)} />
              <Row label="Vencimento" value={fmtDate(detail.dueDate)} />
              <Row label="Pagamento" value={detail.paidAt ? fmtDate(detail.paidAt) : "—"} />
              <Row label="Descrição" value={<span className="text-right text-[12.5px] font-medium">{detail.description}</span>} />
              <Row label="Forma de pagamento" value={detail.method} />
            </Card>

            {detail.status === "recusado" && (
              <Alert kind="danger" title="Comprovante recusado">
                {detail.rejectionReason}
              </Alert>
            )}
            {detail.status === "em_analise" && (
              <Alert kind="info" title="Comprovante enviado — aguardando aprovação">
                Seu comprovante foi enviado e será analisado pela administração.
              </Alert>
            )}

            {detail.status !== "pago" && (
              <div className="rounded-2xl border border-line bg-surface-2/50 p-4">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">
                  Instruções de pagamento
                </p>
                <p className="text-[13px] leading-relaxed text-muted">
                  Realize a transferência via Pix para a chave{" "}
                  <strong className="text-ink">pagamentos@espacovital.com.br</strong> e envie o comprovante
                  nesta tela. A confirmação é feita pela administração em até 1 dia útil.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
