import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useApp } from "../../store";
import { fmtDate, money, toISO } from "../../data/mock";
import {
  Badge,
  Button,
  Card,
  Chip,
  ContractBadge,
  cx,
  Field,
  Input,
  Modal,
  ProgressBar,
  SearchInput,
  Select,
  StatCard,
  TextArea,
  Toggle,
} from "../../components/ui";
import { Row } from "../../components/modals";
import type { Contract, ContractStatus } from "../../types";

const filters: (ContractStatus | "todos")[] = ["todos", "ativo", "vence_em_breve", "vencido", "renovacao"];

const cancelRules = [
  "Cancelamentos com mais de 24h devolvem o crédito integralmente.",
  "Cancelamentos com mais de 48h devolvem o crédito integralmente.",
  "Créditos extras não acumulam para o mês seguinte.",
];

export default function AdminContracts() {
  const { contracts, toggleContract, toast, clients, createContract } = useApp();
  const [f, setF] = useState<ContractStatus | "todos">("todos");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Contract | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    start: toISO(new Date()),
    end: "2026-12-31",
    hours: 30,
    value: 900,
    rule: cancelRules[0],
    limit: 3,
    active: true,
    pdf: "",
  });

  useEffect(() => {
    if (!form.clientId && clients[0]) setForm((f) => ({ ...f, clientId: clients[0].id }));
  }, [clients, form.clientId]);

  const all = contracts;
  const list = useMemo(
    () =>
      all
        .filter((c) => (f === "todos" ? true : c.status === f))
        .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || c.clientName.toLowerCase().includes(q.toLowerCase())),
    [all, f, q],
  );

  const active = all.filter((c) => c.status === "ativo" || c.status === "renovacao").length;
  const expiring = all.filter((c) => c.status === "vence_em_breve").length;
  const expired = all.filter((c) => c.status === "vencido").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">
            Gestão de contratos
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">Crie, acompanhe e ative ou desative contratos.</p>
        </div>
        <Button icon={<Plus className="h-[18px] w-[18px]" />} onClick={() => setCreating(true)}>
          Novo contrato
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ativos" value={active} sub="Contratos vigentes" icon={<CheckCircle2 className="h-5 w-5" />} tone="mint" />
        <StatCard label="Vencendo em 30 dias" value={expiring} sub="Exigem contato" icon={<AlertTriangle className="h-5 w-5" />} tone="amber" />
        <StatCard label="Vencidos" value={expired} sub="Renovação pendente" icon={<XCircle className="h-5 w-5" />} tone="rose" />
        <StatCard label="Em renovação" value={all.filter((c) => c.status === "renovacao").length} sub="Processo em andamento" icon={<RefreshCw className="h-5 w-5" />} tone="brand" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((k) => (
          <Chip key={k} active={f === k} onClick={() => setF(k)}>
            {k === "todos"
              ? "Todos"
              : k === "vence_em_breve"
                ? "Vencendo em breve"
                : k === "renovacao"
                  ? "Em renovação"
                  : k === "ativo"
                    ? "Ativos"
                    : "Vencidos"}
          </Chip>
        ))}
        <div className="ml-auto w-full sm:w-64">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar contrato..." />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((c) => (
          <Card key={c.id} hover className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-bold leading-snug text-ink">{c.title}</h3>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {c.clientName} · {fmtDate(c.start)} → {fmtDate(c.end)}
                </p>
              </div>
              <ContractBadge status={c.status} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
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

            <div className="mt-3 flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-[12.5px] text-muted">
                <ShieldCheck className="h-4 w-4" /> Situação financeira
              </span>
              <Badge tone={c.financial === "em_dia" ? "green" : c.financial === "vencido" ? "red" : "amber"} dot>
                {c.financial === "em_dia" ? "Em dia" : c.financial === "vencido" ? "Vencido" : "Pendente"}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="soft" icon={<Eye className="h-4 w-4" />} onClick={() => setDetail(c)}>
                Visualizar
              </Button>
              <Button size="sm" variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => toast("Download iniciado", c.pdf ?? "Contrato", "info")}>
                Baixar
              </Button>
              <Button
                size="sm"
                variant={c.status === "ativo" ? "danger" : "success"}
                icon={c.status === "ativo" ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                onClick={() => toggleContract(c.id)}
              >
                {c.status === "ativo" ? "Desativar" : "Ativar"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {list.length === 0 && (
        <Card className="p-10 text-center text-[13px] text-muted">Nenhum contrato encontrado.</Card>
      )}

      {/* detail */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title ?? ""}
        subtitle={detail?.clientName}
        icon={<FileText className="h-5 w-5" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetail(null)}>
              Fechar
            </Button>
            <Button icon={<Download className="h-4 w-4" />} onClick={() => toast("Download iniciado", detail?.pdf ?? "Contrato", "info")}>
              Baixar contrato
            </Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <ContractBadge status={detail.status} />
            <Card className="p-4">
              <Row label="Cliente" value={detail.clientName} />
              <Row label="Vigência" value={`${fmtDate(detail.start)} → ${fmtDate(detail.end)}`} />
              <Row label="Horas mensais" value={`${detail.monthlyHours}h`} />
              <Row label="Valor mensal" value={money(detail.monthlyValue)} />
              <Row label="Regra de cancelamento" value={<span className="text-right text-[12.5px] font-medium">{detail.cancelRule}</span>} />
              <Row label="Limite de cancelamentos" value={`${detail.cancelLimit}`} />
              <Row label="Anexo" value={detail.pdf ?? "—"} />
            </Card>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">
                Uso do limite de cancelamentos
              </p>
              <ProgressBar value={detail.cancelUsed} max={detail.cancelLimit} tone="rose" />
            </div>
          </div>
        )}
      </Modal>

      {/* create */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo contrato"
        subtitle="Defina cliente, vigência, horas e regras"
        size="lg"
        icon={<Plus className="h-5 w-5" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!form.clientId) {
                  toast("Selecione um cliente", "Escolha o profissional do contrato.", "warning");
                  return;
                }
                try {
                  await createContract({
                    userId: form.clientId,
                    start: form.start,
                    end: form.end,
                    monthlyHours: form.hours,
                    cancellationLimit: form.limit,
                    cancellationWindowHours: form.rule.includes("48") ? 48 : 24,
                  });
                  setCreating(false);
                } catch {
                  /* toast already shown */
                }
              }}
            >
              Salvar contrato
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente">
              <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Anexar PDF">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface-2/40 px-3 py-2.5 text-[13px] font-semibold text-muted hover:border-brand-400">
                <Download className="h-4 w-4" /> {form.pdf || "Selecionar arquivo"}
                <input type="file" accept=".pdf" className="hidden" onChange={(e) => setForm({ ...form, pdf: e.target.files?.[0]?.name ?? "" })} />
              </label>
            </Field>
            <Field label="Data inicial">
              <Input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field label="Data final">
              <Input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </Field>
            <Field label="Quantidade de horas mensais">
              <Input type="number" value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} />
            </Field>
            <Field label="Valor mensal (R$)">
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label="Regras de cancelamento">
            <Select value={form.rule} onChange={(e) => setForm({ ...form, rule: e.target.value })}>
              {cancelRules.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Limite de cancelamentos por mês">
            <Input type="number" value={form.limit} onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })} />
          </Field>

          <Field label="Observações internas">
            <TextArea placeholder="Informações adicionais sobre o contrato..." />
          </Field>

          <div className={cx("flex items-center justify-between rounded-2xl border border-line bg-surface-2/50 p-4")}>
            <div>
              <p className="text-[13.5px] font-bold text-ink">Contrato ativo</p>
              <p className="text-[12px] text-muted">Ative para liberar reservas imediatamente.</p>
            </div>
            <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
