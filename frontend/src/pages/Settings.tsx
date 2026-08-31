import { useState } from "react";
import { Bell, Database, KeyRound, Moon, Palette, Plug, ShieldCheck, Sun } from "lucide-react";
import { useApp } from "../store";
import { Badge, Button, Card, Field, Input, SectionTitle, Select, Toggle, cx } from "../components/ui";

const tabs = [
  { key: "aparencia", label: "Aparência", icon: <Palette className="h-4 w-4" /> },
  { key: "notificacoes", label: "Notificações", icon: <Bell className="h-4 w-4" /> },
  { key: "seguranca", label: "Segurança", icon: <ShieldCheck className="h-4 w-4" /> },
  { key: "integracoes", label: "Integrações", icon: <Plug className="h-4 w-4" /> },
];

export default function Settings() {
  const { theme, toggleTheme, toast, role } = useApp();
  const [tab, setTab] = useState("aparencia");
  const [prefs, setPrefs] = useState({
    email: true,
    whats: true,
    push: false,
    contract: true,
    credits: true,
    payments: true,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Configurações</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Personalize sua experiência e prepare a plataforma para integrações futuras.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
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
          {tab === "aparencia" && (
            <Card className="p-5">
              <SectionTitle title="Tema da interface" subtitle="Escolha entre o tema claro sofisticado e o dark mode" />
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["light", "Tema claro", "Fundos claros e alta legibilidade", <Sun key="s" className="h-5 w-5" />],
                    ["dark", "Dark mode", "Ideal para uso noturno", <Moon key="m" className="h-5 w-5" />],
                  ] as ["light" | "dark", string, string, React.ReactNode][]
                ).map(([k, label, desc, icon]) => (
                  <button
                    key={k}
                    onClick={() => theme !== k && toggleTheme()}
                    className={cx(
                      "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                      theme === k ? "border-brand-600 bg-brand-50/60 dark:bg-brand-500/10" : "border-line hover:border-brand-300",
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        theme === k ? "bg-brand-600 text-white" : "bg-surface-2 text-muted",
                      )}
                    >
                      {icon}
                    </span>
                    <span>
                      <span className="block text-[13.5px] font-bold text-ink">{label}</span>
                      <span className="block text-[12px] text-muted">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Idioma">
                  <Select defaultValue="pt-BR">
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </Select>
                </Field>
                <Field label="Fuso horário">
                  <Select defaultValue="sp">
                    <option value="sp">America/Sao_Paulo (GMT-3)</option>
                    <option value="rj">America/Rio_Branco (GMT-5)</option>
                  </Select>
                </Field>
              </div>
            </Card>
          )}

          {tab === "notificacoes" && (
            <Card className="p-5">
              <SectionTitle title="Canais de notificação" subtitle="Onde você deseja ser avisado" />
              <div className="space-y-4">
                <Toggle checked={prefs.email} onChange={(v) => setPrefs({ ...prefs, email: v })} label="E-mail" />
                <Toggle checked={prefs.whats} onChange={(v) => setPrefs({ ...prefs, whats: v })} label="WhatsApp" />
                <Toggle checked={prefs.push} onChange={(v) => setPrefs({ ...prefs, push: v })} label="Notificações push do navegador" />
              </div>
              <div className="mt-6 space-y-4">
                <SectionTitle title="Alertas do sistema" subtitle="Eventos que geram avisos" />
                <Toggle checked={prefs.contract} onChange={(v) => setPrefs({ ...prefs, contract: v })} label="Vencimento de contratos" />
                <Toggle checked={prefs.credits} onChange={(v) => setPrefs({ ...prefs, credits: v })} label="Saldo de créditos baixo" />
                <Toggle checked={prefs.payments} onChange={(v) => setPrefs({ ...prefs, payments: v })} label="Cobranças e comprovantes" />
              </div>
            </Card>
          )}

          {tab === "seguranca" && (
            <Card className="p-5">
              <SectionTitle title="Segurança da conta" subtitle="Alteração de senha e sessões" icon={<KeyRound className="h-[18px] w-[18px]" />} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Senha atual">
                  <Input type="password" placeholder="••••••••" />
                </Field>
                <div />
                <Field label="Nova senha">
                  <Input type="password" placeholder="••••••••" />
                </Field>
                <Field label="Confirmar nova senha">
                  <Input type="password" placeholder="••••••••" />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => toast("Senha atualizada", "Sua senha foi alterada com sucesso.", "success")}>
                  Atualizar senha
                </Button>
                <Button variant="outline">Encerrar outras sessões</Button>
              </div>
              <div className="mt-6 rounded-2xl border border-line bg-surface-2/50 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-mint-600" />
                  <p className="text-[13.5px] font-bold text-ink">Autenticação em dois fatores</p>
                  <Badge tone="amber">Em breve</Badge>
                </div>
                <p className="mt-1.5 text-[12.5px] text-muted">
                  Módulo preparado na arquitetura para conectar com o provedor de autenticação.
                </p>
              </div>
            </Card>
          )}

          {tab === "integracoes" && (
            <div className="space-y-4">
              <Card className="p-5">
                <SectionTitle title="Integrações previstas" subtitle="Arquitetura pronta para conectar serviços reais" icon={<Database className="h-[18px] w-[18px]" />} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { n: "API REST", d: "Camada de serviços isolada para consumo futuro", s: "Estruturado" },
                    { n: "Banco de dados", d: "Repositórios mockados prontos para troca", s: "Estruturado" },
                    { n: "Pagamentos", d: "Pix, boletos e conciliação automática", s: "Em breve" },
                    { n: "Upload de contratos", d: "Armazenamento de PDFs assinados", s: "Em breve" },
                    { n: "Notificações push", d: "Firebase Cloud Messaging", s: "Em breve" },
                    { n: "Controle de permissões", d: "RBAC por papel (cliente/admin)", s: role === "admin" ? "Ativo" : "Em breve" },
                  ].map((i) => (
                    <div key={i.n} className="rounded-2xl border border-line p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13.5px] font-bold text-ink">{i.n}</p>
                        <Badge tone={i.s === "Ativo" ? "green" : "slate"}>{i.s}</Badge>
                      </div>
                      <p className="mt-1 text-[12.5px] text-muted">{i.d}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
