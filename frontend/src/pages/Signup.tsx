import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Mail,
  Phone,
  QrCode,
  Sparkles,
  User,
} from "lucide-react";
import { useApp } from "../store";
import { Button, Card, cx, Field, Input } from "../components/ui";
import { Logo } from "../components/layout";

export type SignupPlan = "FREE" | "MONTHLY" | "YEARLY";
export type SignupPaymentMethod = "card" | "pix";

const PLANS: {
  key: SignupPlan;
  name: string;
  price: string;
  period: string;
  highlight?: string;
  points: string[];
}[] = [
  {
    key: "FREE",
    name: "Free",
    price: "R$ 0",
    period: "30 dias grátis",
    points: ["Acesso completo de administrador", "Cadastre salas e profissionais", "Sem cartão no período de teste"],
  },
  {
    key: "MONTHLY",
    name: "Mensal",
    price: "R$ 199,90",
    period: "por mês",
    points: ["Tudo do plano Free", "Cobrança recorrente mensal", "Cancele quando quiser"],
  },
  {
    key: "YEARLY",
    name: "Anual",
    price: "R$ 179,90",
    period: "pagamento único",
    highlight: "Melhor custo",
    points: ["Tudo do plano Mensal", "Um pagamento por ano", "Economia em relação ao mensal"],
  },
];

function formatCard(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskEmail(value: string) {
  const cleaned = value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9._%+\-@]/g, "");
  const at = cleaned.indexOf("@");
  if (at === -1) return cleaned.slice(0, 64);
  const local = cleaned.slice(0, at).replace(/@/g, "").slice(0, 64);
  const domain = cleaned
    .slice(at + 1)
    .replace(/@/g, "")
    .replace(/[^a-z0-9.-]/g, "")
    .slice(0, 255);
  if (cleaned.endsWith("@") && domain.length === 0) return `${local}@`;
  return domain ? `${local}@${domain}` : local;
}

const EMAIL_PATTERN = /^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export default function Signup({ onBack }: { onBack: () => void }) {
  const { register, toast, theme, toggleTheme } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [plan, setPlan] = useState<SignupPlan>("FREE");
  const [paymentMethod, setPaymentMethod] = useState<SignupPaymentMethod>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneOk = phoneDigits.length === 0 || phoneDigits.length === 10 || phoneDigits.length === 11;
  const passwordOk = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
  const dataOk =
    name.trim().length > 1 &&
    spaceName.trim().length > 1 &&
    EMAIL_PATTERN.test(email) &&
    phoneOk &&
    passwordOk &&
    password === confirm;

  const cardOk =
    cardNumber.replace(/\D/g, "").length === 16 &&
    cardName.trim().length > 2 &&
    /^\d{2}\/\d{2}$/.test(cardExpiry) &&
    cardCvv.replace(/\D/g, "").length >= 3;

  const selected = useMemo(() => PLANS.find((p) => p.key === plan)!, [plan]);
  const needsPayment = plan !== "FREE";

  const goPayment = () => {
    if (!needsPayment) {
      void submit();
      return;
    }
    setStep(3);
  };

  const submit = async () => {
    if (needsPayment && paymentMethod === "card" && !cardOk) {
      toast("Cartão incompleto", "Preencha os dados do cartão para continuar.", "warning");
      return;
    }
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        spaceName: spaceName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        plan,
        paymentMethod: needsPayment ? paymentMethod : undefined,
      });
      toast("Conta criada", "Bem-vindo ao G-Salas. Seu acesso de administrador está ativo.", "success");
    } catch (error) {
      toast(
        "Não foi possível concluir o cadastro",
        error instanceof Error ? error.message : "Tente novamente.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-canvas">
      <button
        onClick={toggleTheme}
        className="absolute right-4 top-4 z-20 rounded-xl border border-line bg-surface/80 p-2.5 text-muted backdrop-blur transition-colors hover:text-ink"
        aria-label="Alternar tema"
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Logo />
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </button>
        </div>

        <div className="mb-8">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-faint">Cadastro</p>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-ink sm:text-[30px]">
            Crie sua conta de administrador
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-muted">
            Preencha seus dados, escolha o plano e libere o painel para gerenciar salas, profissionais e agenda.
          </p>
        </div>

        <ol className="mb-8 grid grid-cols-3 gap-2">
          {[
            { n: 1, label: "Dados" },
            { n: 2, label: "Plano" },
            { n: 3, label: "Pagamento" },
          ].map((item) => (
            <li
              key={item.n}
              className={cx(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold",
                step === item.n
                  ? "border-brand-600 bg-brand-50/70 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                  : step > item.n
                    ? "border-mint-500/30 bg-mint-50/60 text-mint-700 dark:bg-mint-500/10 dark:text-mint-400"
                    : "border-line bg-surface text-faint",
              )}
            >
              <span
                className={cx(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                  step > item.n ? "bg-mint-600 text-white" : step === item.n ? "bg-brand-600 text-white" : "bg-surface-2",
                )}
              >
                {step > item.n ? <Check className="h-3.5 w-3.5" /> : item.n}
              </span>
              {item.label}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <Card className="p-6 sm:p-7">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (dataOk) setStep(2);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome completo">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-11" placeholder="Seu nome" required />
                  </div>
                </Field>
                <Field label="Nome do espaço">
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
                    <Input
                      value={spaceName}
                      onChange={(e) => setSpaceName(e.target.value)}
                      className="pl-11"
                      placeholder="Clínica ou consultório"
                      required
                    />
                  </div>
                </Field>
              </div>
              <Field label="E-mail">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
                  <Input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(maskEmail(e.target.value))}
                    className="pl-11"
                    placeholder="voce@email.com"
                    required
                  />
                </div>
              </Field>
              <Field label="Telefone" hint="Opcional · (11) 99999-0000">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    className="pl-11"
                    placeholder="(11) 99999-0000"
                    maxLength={16}
                  />
                </div>
              </Field>
              {phoneDigits.length > 0 && !phoneOk && (
                <p className="text-[12.5px] font-medium text-rose-600">Informe um telefone com DDD, 10 ou 11 dígitos.</p>
              )}
              {email.length > 0 && !EMAIL_PATTERN.test(email) && (
                <p className="text-[12.5px] font-medium text-rose-600">Informe um e-mail no formato nome@dominio.com.</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Senha" hint="Mínimo 8 caracteres, com letras e números">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirmar senha">
                  <Input type={showPassword ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </Field>
              </div>
              {confirm.length > 0 && password !== confirm && (
                <p className="text-[12.5px] font-medium text-rose-600">As senhas não coincidem.</p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={!dataOk}>
                Prosseguir
                <ArrowRight className="h-[18px] w-[18px]" />
              </Button>
            </form>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {PLANS.map((item) => {
                const active = plan === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPlan(item.key)}
                    className={cx(
                      "relative flex flex-col rounded-2xl border p-5 text-left transition-all",
                      active
                        ? "border-brand-600 bg-brand-50/70 shadow-[0_10px_24px_-14px_rgba(20,100,133,.8)] dark:bg-brand-500/10"
                        : "border-line bg-surface hover:border-brand-300",
                    )}
                  >
                    {item.highlight && (
                      <span className="absolute right-3 top-3 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        {item.highlight}
                      </span>
                    )}
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                      {item.key === "FREE" ? <Gift className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                    </span>
                    <p className="mt-4 text-[15px] font-extrabold text-ink">{item.name}</p>
                    <p className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">{item.price}</p>
                    <p className="text-[12.5px] font-medium text-muted">{item.period}</p>
                    <ul className="mt-4 space-y-1.5">
                      {item.points.map((point) => (
                        <li key={point} className="flex gap-2 text-[12.5px] text-muted">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    {active && (
                      <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button size="lg" className="flex-1" onClick={goPayment} disabled={loading}>
                {needsPayment ? "Ir para pagamento" : loading ? "Ativando..." : "Ativar 30 dias grátis"}
                <ArrowRight className="h-[18px] w-[18px]" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <Card className="p-6 sm:p-7">
            <div className="mb-5 rounded-xl bg-surface-2/70 px-4 py-3">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">Resumo</p>
              <p className="mt-1 text-[15px] font-bold text-ink">
                {selected.name} · {selected.price}{" "}
                <span className="font-medium text-muted">({selected.period})</span>
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={cx(
                  "flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-semibold",
                  paymentMethod === "card" ? "border-brand-600 bg-brand-50/70 text-ink dark:bg-brand-500/10" : "border-line text-muted",
                )}
              >
                <CreditCard className="h-[18px] w-[18px]" /> Cartão
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("pix")}
                className={cx(
                  "flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-semibold",
                  paymentMethod === "pix" ? "border-brand-600 bg-brand-50/70 text-ink dark:bg-brand-500/10" : "border-line text-muted",
                )}
              >
                <QrCode className="h-[18px] w-[18px]" /> Pix
              </button>
            </div>

            {paymentMethod === "card" ? (
              <div className="space-y-4">
                <Field label="Número do cartão">
                  <Input
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCard(e.target.value))}
                    placeholder="ACCT-000003"
                  />
                </Field>
                <Field label="Nome impresso">
                  <Input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Como no cartão" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Validade">
                    <Input
                      inputMode="numeric"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/AA"
                    />
                  </Field>
                  <Field label="CVV">
                    <Input
                      inputMode="numeric"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                    />
                  </Field>
                </div>
                <p className="text-[12px] text-faint">Pagamento simulado neste MVP — nenhum valor é cobrado agora.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface-2/50 p-5 text-center">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl bg-white text-brand-800 shadow-sm dark:bg-surface">
                  <QrCode className="h-16 w-16" />
                </div>
                <p className="mt-4 text-[13.5px] font-bold text-ink">Pix Copia e Cola</p>
                <p className="mt-1 break-all font-mono text-[12px] text-muted">GSALAS-PIX-{email.split("@")[0].toUpperCase() || "CONTA"}</p>
                <p className="mt-3 text-[12.5px] text-faint">Ambiente de demonstração: confirme para liberar o acesso imediatamente.</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>
                Voltar
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={() => void submit()}
                disabled={loading || (paymentMethod === "card" && !cardOk)}
              >
                {loading ? "Confirmando..." : "Pagar e liberar acesso"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
