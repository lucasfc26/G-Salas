import { useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Headphones,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useApp } from "../store";
import { Button, Card, cx, Input, Toggle } from "../components/ui";
import { Logo } from "../components/layout";
import type { Role } from "../types";

const roles: { key: Role; label: string; desc: string; icon: React.ReactNode; email: string }[] = [
  {
    key: "client",
    label: "Cliente",
    desc: "Profissional de saúde",
    icon: <User className="h-[18px] w-[18px]" />,
    email: "cliente@gsalas.dev",
  },
  {
    key: "admin",
    label: "Administrador",
    desc: "Gestão do espaço",
    icon: <ShieldCheck className="h-[18px] w-[18px]" />,
    email: "admin@gsalas.dev",
  },
];

export default function Login() {
  const { login, theme, toggleTheme, toast, requestPasswordReset } = useApp();
  const [role, setRole] = useState<Role>("client");
  const [email, setEmail] = useState("cliente@gsalas.dev");
  const [password, setPassword] = useState("Senha@123");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, remember);
    } catch (error) {
      toast("Não foi possível entrar", error instanceof Error ? error.message : "Verifique o e-mail e a senha.", "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-canvas">
      {/* theme button */}
      <button
        onClick={toggleTheme}
        className="absolute right-4 top-4 z-20 rounded-xl border border-line bg-surface/80 p-2.5 text-muted backdrop-blur transition-colors hover:text-ink"
      >
        {theme === "light" ? (
          <span className="block h-[18px] w-[18px]">🌙</span>
        ) : (
          <span className="block h-[18px] w-[18px]">☀️</span>
        )}
      </button>

      <div className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-[52%] lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[420px] animate-fade-up">
          <Logo />
          <h1 className="mt-9 text-[26px] font-extrabold tracking-tight text-ink sm:text-[30px]">
            Bem-vindo de volta
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            Acesse sua conta para gerenciar suas salas, créditos e atendimentos.
          </p>

          {/* role selector */}
          <div className="mt-7">
            <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-faint">
              Acessar como
            </p>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((r) => (
                <button
                  key={r.key}
                  onClick={() => {
                    setRole(r.key);
                    setEmail(r.email);
                  }}
                  className={cx(
                    "relative flex flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-left transition-all duration-300",
                    role === r.key
                      ? "border-brand-600 bg-brand-50/70 shadow-[0_10px_24px_-14px_rgba(20,100,133,.8)] dark:bg-brand-500/10"
                      : "border-line bg-surface hover:border-brand-300",
                  )}
                >
                  <span
                    className={cx(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                      role === r.key ? "bg-brand-600 text-white" : "bg-surface-2 text-muted",
                    )}
                  >
                    {r.icon}
                  </span>
                  <span className="text-[13.5px] font-bold text-ink">{r.label}</span>
                  <span className="text-[11.5px] text-faint">{r.desc}</span>
                  {role === r.key && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-faint">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-faint">
                Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
                >
                  {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Toggle checked={remember} onChange={setRemember} label="Lembrar de mim" />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await requestPasswordReset(email);
                  } catch {
                    /* backend always answers the same way */
                  }
                  toast("Link enviado", "Se o e-mail existir, enviaremos as instruções de recuperação.", "info");
                }}
                className="text-[12.5px] font-semibold text-brand-600 hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
              {!loading && <ArrowRight className="h-[18px] w-[18px]" />}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-5 text-[12.5px]">
            <span className="text-muted">Precisa de ajuda?</span>
            <button
              onClick={() => toast("Suporte", "Fale com a equipe: suporte@gsalas.dev", "info")}
              className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline"
            >
              <Headphones className="h-4 w-4" /> Falar com o suporte
            </button>
          </div>

          <p className="mt-6 text-center text-[11.5px] text-faint">
            Ambiente de desenvolvimento · use as contas de seed do backend
          </p>
        </div>
      </div>

      {/* side panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[48%]">
        <img src="/images/auth.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-900/50 to-brand-900/20" />
        <div className="relative z-10 flex h-full w-full flex-col justify-end p-12 xl:p-16">
          <div className="max-w-md animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-wider text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> G-Salas · Consultórios sob demanda
            </span>
            <h2 className="mt-5 text-[40px] font-extrabold leading-[1.1] tracking-tight text-white xl:text-[48px]">
              G-Salas
            </h2>
            <p className="mt-1 text-[16px] font-medium text-white/85">
              Salas para psicólogos, dentistas, nutricionistas, fisioterapeutas e outros profissionais
            </p>
            <h3 className="mt-5 text-[22px] font-extrabold leading-[1.15] tracking-tight text-white xl:text-[26px]">
              Sua agenda organizada. Suas horas sob controle.
            </h3>
            <p className="mt-4 text-[14.5px] leading-relaxed text-white/80">
              Reserve salas e consultórios por horas-crédito, acompanhe contratos, faturas e cancelamentos
              em um só lugar — com a tranquilidade que o seu atendimento exige.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { v: "8", l: "Salas" },
                { v: "42", l: "Profissionais" },
                { v: "486h", l: "Horas/mês" },
              ].map((s) => (
                <Card key={s.l} className="border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-[22px] font-extrabold text-white">{s.v}</p>
                  <p className="text-[11.5px] font-medium uppercase tracking-wide text-white/70">{s.l}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
