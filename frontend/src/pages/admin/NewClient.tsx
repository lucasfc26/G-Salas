import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Mail, Phone, ShieldCheck, User, UserPlus } from "lucide-react";
import { useApp } from "../../store";
import { Button, Card, Field, Input } from "../../components/ui";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function NewClient() {
  const { navigate, createClient } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(randomPassword());
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
  const canSubmit = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && passwordValid;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const id = await createClient({ name: name.trim(), email: email.trim(), phone: phone.trim(), password });
      navigate("clients", id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate("clients")}>
        Voltar para clientes
      </Button>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Novo cliente</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Crie a conta de acesso do profissional. Depois de cadastrado, configure o contrato e o plano de horas.
        </p>
      </div>

      <Card className="mx-auto max-w-xl p-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nome completo">
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-11"
                placeholder="Nome do profissional"
                required
              />
            </div>
          </Field>

          <Field label="E-mail">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11"
                placeholder="cliente@email.com"
                required
              />
            </div>
          </Field>

          <Field label="Telefone" hint="Opcional">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-11"
                placeholder="(11) 98877-6655"
              />
            </div>
          </Field>

          <Field
            label="Senha provisória"
            hint="Mínimo 8 caracteres, com letras e números. Compartilhe com o cliente no primeiro acesso."
          >
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-24"
                required
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPassword(randomPassword())}
                  className="rounded-lg px-2 py-1 text-[11.5px] font-semibold text-brand-600 hover:underline"
                >
                  Gerar
                </button>
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="p-1.5 text-faint hover:text-ink"
                >
                  {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>
          </Field>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate("clients")}>
              Cancelar
            </Button>
            <Button type="submit" icon={<UserPlus className="h-[18px] w-[18px]" />} disabled={!canSubmit || loading}>
              {loading ? "Cadastrando..." : "Cadastrar cliente"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
