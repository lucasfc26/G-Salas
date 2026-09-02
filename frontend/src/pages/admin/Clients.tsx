import { useMemo, useState } from "react";
import { Eye, Filter, Plus, UserPlus, Users } from "lucide-react";
import { useApp } from "../../store";
import { fmtDate, money } from "../../data/mock";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  ContractBadge,
  EmptyState,
  ProgressBar,
  SearchInput,
} from "../../components/ui";
import { maskEmail, maskPhone } from "../../utils/masks";

const filters = ["todos", "ativo", "inativo", "vencido", "vencendo"] as const;

export default function Clients() {
  const { navigate, clients, contracts, payments } = useApp();
  const [f, setF] = useState<(typeof filters)[number]>("todos");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    return clients
      .filter((c) => {
        if (f === "todos") return true;
        if (f === "vencido") return c.contractStatus === "vencido";
        if (f === "vencendo") return c.contractStatus === "vence_em_breve";
        return c.status === f;
      })
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.email.toLowerCase().includes(q.toLowerCase()) ||
          c.profession.toLowerCase().includes(q.toLowerCase()),
      );
  }, [f, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Clientes</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {clients.length} profissionais cadastrados · {clients.filter((c) => c.status === "ativo").length} ativos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar cliente..." />
          <Button icon={<UserPlus className="h-[18px] w-[18px]" />} onClick={() => navigate("new-client")}>
            Novo cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-faint" />
        {filters.map((k) => (
          <Chip key={k} active={f === k} onClick={() => setF(k)}>
            {k === "todos"
              ? "Todos"
              : k === "vencido"
                ? "Contrato vencido"
                : k === "vencendo"
                  ? "Próximo do vencimento"
                  : k === "ativo"
                    ? "Ativos"
                    : "Inativos"}
          </Chip>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-2/50 text-left">
                {["Profissional", "Profissão", "Contato", "Plano", "Horas", "Contrato", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide text-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const contract = contracts.find((ct) => ct.clientId === c.id);
                const openPayments = payments.filter(
                  (p) => p.clientId === c.id && (p.status === "pendente" || p.status === "vencido"),
                );
                return (
                  <tr key={c.id} className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate("clients", c.id)} className="flex items-center gap-3 text-left">
                        <Avatar name={c.name} size={38} color={c.color} />
                        <span>
                          <span className="block text-[13px] font-bold text-ink hover:underline">{c.name}</span>
                          <span className="block text-[11.5px] text-faint">{c.registry}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-muted">{c.profession}</td>
                    <td className="px-4 py-3">
                      <span className="block text-[12.5px] text-ink">{maskEmail(c.email)}</span>
                      <span className="block text-[11.5px] text-faint">{maskPhone(c.phone)}</span>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] font-semibold text-ink">{c.plan}</td>
                    <td className="px-4 py-3">
                      <div className="w-28">
                        <div className="mb-1 flex justify-between text-[11px] font-semibold">
                          <span className="text-muted">
                            {c.usedHours}/{c.monthlyHours}h
                          </span>
                          <span className="text-faint">{Math.round((c.usedHours / c.monthlyHours) * 100)}%</span>
                        </div>
                        <ProgressBar value={c.usedHours} max={c.monthlyHours} height={5} tone={c.usedHours / c.monthlyHours > 0.8 ? "rose" : "mint"} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {contract && <ContractBadge status={contract.status} />}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={c.status === "ativo" ? "green" : "slate"} dot>
                        {c.status}
                      </Badge>
                      {openPayments.length > 0 && (
                        <span className="mt-1 block text-[11px] font-semibold text-amber-600">
                          {money(openPayments.reduce((s, p) => s + p.value, 0))} em aberto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="soft" icon={<Eye className="h-4 w-4" />} onClick={() => navigate("clients", c.id)}>
                        Ver
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-line lg:hidden">
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate("clients", c.id)}
              className="block w-full p-4 text-left transition-colors hover:bg-surface-2/60"
            >
              <div className="flex items-center gap-3">
                <Avatar name={c.name} size={44} color={c.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink">{c.name}</p>
                  <p className="truncate text-[12px] text-muted">{c.profession}</p>
                </div>
                <Badge tone={c.status === "ativo" ? "green" : "slate"} dot>
                  {c.status}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-surface-2/60 p-2">
                  <p className="text-[10.5px] uppercase text-faint">Plano</p>
                  <p className="text-[12px] font-bold text-ink">{c.plan}</p>
                </div>
                <div className="rounded-lg bg-surface-2/60 p-2">
                  <p className="text-[10.5px] uppercase text-faint">Usado</p>
                  <p className="text-[12px] font-bold text-ink">
                    {c.usedHours}/{c.monthlyHours}h
                  </p>
                </div>
                <div className="rounded-lg bg-surface-2/60 p-2">
                  <p className="text-[10.5px] uppercase text-faint">Desde</p>
                  <p className="text-[12px] font-bold text-ink">{fmtDate(c.joinedAt).slice(3)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {list.length === 0 && (
          <div className="p-6">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Nenhum cliente encontrado"
              message="Ajuste os filtros ou a busca para ver outros resultados."
              action={
                <Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => navigate("new-client")}>
                  Cadastrar cliente
                </Button>
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
}
