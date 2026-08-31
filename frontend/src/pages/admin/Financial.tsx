import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Receipt,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { useApp } from "../../store";
import { fmtDate, money } from "../../data/mock";
import {
  Avatar,
  Button,
  Card,
  Chip,
  cx,
  EmptyState,
  Modal,
  PaymentBadge,
  SectionTitle,
  StatCard,
} from "../../components/ui";
import { RejectModal, Row } from "../../components/modals";
import type { Payment, PaymentStatus } from "../../types";

const filters: (PaymentStatus | "todos")[] = ["todos", "pago", "pendente", "em_analise", "vencido", "recusado"];

export default function AdminFinancial() {
  const { payments, approvePayment, toast, clients } = useApp();
  const [f, setF] = useState<PaymentStatus | "todos">("todos");
  const [rejectFor, setRejectFor] = useState<Payment | null>(null);
  const [viewReceipt, setViewReceipt] = useState<Payment | null>(null);

  const all = payments;
  const pendingAnalysis = all.filter((p) => p.status === "em_analise");
  const received = all.filter((p) => p.status === "pago").reduce((s, p) => s + p.value, 0);
  const open = all.filter((p) => p.status === "pendente").reduce((s, p) => s + p.value, 0);
  const overdue = all.filter((p) => p.status === "vencido" || p.status === "recusado");
  const overdueValue = overdue.reduce((s, p) => s + p.value, 0);

  const list = useMemo(
    () => all.filter((p) => (f === "todos" ? true : p.status === f)).sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    [all, f],
  );

  const clientOf = (id: string) => clients.find((c) => c.id === id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Financeiro</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Faturamento, conferência de comprovantes e controle de cobranças.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento previsto" value={money(all.reduce((s, p) => s + p.value, 0))} sub="Soma das cobranças" icon={<TrendingUp className="h-5 w-5" />} tone="brand" />
        <StatCard label="Recebido" value={money(received)} sub="Pagamentos confirmados" icon={<CheckCircle2 className="h-5 w-5" />} tone="mint" />
        <StatCard label="Em aberto" value={money(open)} sub="Cobranças a vencer" icon={<Wallet className="h-5 w-5" />} tone="amber" />
        <StatCard label="Vencido" value={money(overdueValue)} sub={`${overdue.length} cobrança(s)`} icon={<XCircle className="h-5 w-5" />} tone="rose" />
      </div>

      {/* receipts */}
      <Card className="p-5">
        <SectionTitle
          title="Comprovantes aguardando análise"
          subtitle={`${pendingAnalysis.length} pagamento(s) enviado(s) pelos clientes`}
          icon={<Receipt className="h-[18px] w-[18px]" />}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {pendingAnalysis.map((p) => {
            const c = clientOf(p.clientId);
            return (
              <div key={p.id} className="rounded-2xl border border-violet-500/30 bg-violet-50/50 p-4 dark:bg-violet-500/10">
                <div className="flex items-start gap-3">
                  <Avatar name={p.clientName} size={40} color={c?.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-ink">{p.clientName}</p>
                    <p className="truncate text-[12.5px] text-muted">Aluguel — {p.competence}</p>
                    <p className="mt-1 text-[15px] font-extrabold text-ink">{money(p.value)}</p>
                  </div>
                  <PaymentBadge status={p.status} />
                </div>
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/60 px-2.5 py-1.5 text-[11.5px] font-medium text-muted dark:bg-white/5">
                  <FileText className="h-3.5 w-3.5" /> {p.receipt ?? "comprovante.pdf"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" icon={<Eye className="h-4 w-4" />} onClick={() => setViewReceipt(p)}>
                    Visualizar comprovante
                  </Button>
                  <Button size="sm" variant="success" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => approvePayment(p.id)}>
                    Aprovar pagamento
                  </Button>
                  <Button size="sm" variant="danger" icon={<XCircle className="h-4 w-4" />} onClick={() => setRejectFor(p)}>
                    Recusar
                  </Button>
                </div>
              </div>
            );
          })}
          {pendingAnalysis.length === 0 && (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Nada pendente"
              message="Todos os comprovantes enviados foram analisados."
            />
          )}
        </div>
      </Card>

      {/* charges table */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-5">
          <SectionTitle title="Controle de cobranças" subtitle={`${list.length} registro(s)`} />
          <div className="ml-auto flex flex-wrap gap-2">
            {filters.map((k) => (
              <Chip key={k} active={f === k} onClick={() => setF(k)}>
                {k === "todos"
                  ? "Todos"
                  : k === "em_analise"
                    ? "Em análise"
                    : k === "pago"
                      ? "Pagos"
                      : k === "pendente"
                        ? "Pendentes"
                        : k === "vencido"
                          ? "Vencidos"
                          : "Recusados"}
              </Chip>
            ))}
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-2/50 text-left">
                {["Cliente", "Competência", "Valor", "Vencimento", "Status", "Comprovante"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide text-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const c = clientOf(p.clientId);
                return (
                  <tr key={p.id} className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={p.clientName} size={30} color={c?.color} />
                        <span className="text-[13px] font-semibold text-ink">{p.clientName}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">{p.competence}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-ink">{money(p.value)}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{fmtDate(p.dueDate)}</td>
                    <td className="px-4 py-3">
                      <PaymentBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      {p.receipt || p.status === "pago" ? (
                        <button
                          onClick={() => setViewReceipt(p)}
                          className="text-[12px] font-semibold text-brand-600 hover:underline"
                        >
                          Ver
                        </button>
                      ) : (
                        <span className="text-[12.5px] text-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-line md:hidden">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <Avatar name={p.clientName} size={36} color={clientOf(p.clientId)?.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink">{p.clientName}</p>
                <p className="text-[12px] text-muted">
                  {p.competence} · {fmtDate(p.dueDate)}
                </p>
                <div className="mt-1.5">
                  <PaymentBadge status={p.status} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-extrabold text-ink">{money(p.value)}</p>
                {(p.receipt || p.status === "pago") && (
                  <button onClick={() => setViewReceipt(p)} className="text-[11.5px] font-semibold text-brand-600">
                    Ver comprovante
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {list.length === 0 && (
          <div className="p-6">
            <EmptyState icon={<FileText className="h-6 w-6" />} title="Sem cobranças" message="Nenhum registro para o filtro selecionado." />
          </div>
        )}
      </Card>

      <RejectModal open={!!rejectFor} onClose={() => setRejectFor(null)} payment={rejectFor} />

      <Modal
        open={!!viewReceipt}
        onClose={() => setViewReceipt(null)}
        title="Comprovante de pagamento"
        subtitle={viewReceipt ? `${viewReceipt.clientName} · ${viewReceipt.competence}` : ""}
        icon={<FileText className="h-5 w-5" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setViewReceipt(null)}>
              Fechar
            </Button>
            {viewReceipt && viewReceipt.status === "em_analise" && (
              <>
                <Button variant="danger" onClick={() => { setRejectFor(viewReceipt); setViewReceipt(null); }}>
                  Recusar
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    approvePayment(viewReceipt.id);
                    setViewReceipt(null);
                  }}
                >
                  Aprovar pagamento
                </Button>
              </>
            )}
            {viewReceipt && viewReceipt.status === "pendente" && (
              <Button onClick={() => { toast("Lembrete enviado", `${viewReceipt.clientName} foi notificado sobre a cobrança.`, "info"); setViewReceipt(null); }}>
                Enviar lembrete
              </Button>
            )}
          </>
        }
      >
        {viewReceipt && (
          <div className="space-y-4">
            <Card className="p-4">
              <Row label="Cliente" value={viewReceipt.clientName} />
              <Row label="Competência" value={viewReceipt.competence} />
              <Row label="Valor" value={money(viewReceipt.value)} />
              <Row label="Vencimento" value={fmtDate(viewReceipt.dueDate)} />
              <Row label="Forma de pagamento" value={viewReceipt.method} />
              <Row label="Arquivo" value={viewReceipt.receipt ?? "—"} />
            </Card>

            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2/40 px-6 py-10 text-center">
              <span className={cx("mb-3 flex h-14 w-14 items-center justify-center rounded-2xl", viewReceipt.status === "pago" ? "bg-mint-50 text-mint-600 dark:bg-mint-500/15" : "bg-brand-50 text-brand-600 dark:bg-brand-500/15")}>
                <FileText className="h-7 w-7" />
              </span>
              <p className="text-[14px] font-bold text-ink">{viewReceipt.receipt ?? "Sem comprovante anexado"}</p>
              <p className="mt-1 max-w-sm text-[12.5px] text-muted">
                {viewReceipt.status === "pago"
                  ? `Pagamento confirmado em ${viewReceipt.paidAt ? fmtDate(viewReceipt.paidAt) : fmtDate(viewReceipt.dueDate)}.`
                  : "Pré-visualização simulada neste MVP. O arquivo real será exibido após integração com o storage."}
              </p>
              {viewReceipt.status === "em_analise" && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11.5px] font-bold uppercase text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  <Clock className="h-3.5 w-3.5" /> Aguardando conferência
                </span>
              )}
            </div>

            {viewReceipt.status === "recusado" && (
              <div className="rounded-2xl border border-rose-500/25 bg-rose-50/60 p-4 text-[12.5px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                <strong>Motivo da recusa:</strong> {viewReceipt.rejectionReason}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
