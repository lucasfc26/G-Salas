import { useState } from "react";
import { Building2, Camera, MapPin, Save, Sparkles, Stethoscope, User } from "lucide-react";
import { useApp } from "../../store";
import type { Client } from "../../types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Input,
  SectionTitle,
  Select,
  TextArea,
  Toggle,
  cx,
} from "../../components/ui";
import type { Modality } from "../../types";

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const periods = ["Manhã", "Tarde", "Noite"];

const emptyClient: Client = {
  id: "",
  name: "",
  professionalName: "",
  profession: "",
  registry: "",
  email: "",
  phone: "",
  whatsapp: "",
  document: "",
  birthDate: "",
  plan: "—",
  monthlyHours: 0,
  usedHours: 0,
  contractStatus: "ativo",
  status: "ativo",
  modality: "presencial",
  specialties: [],
  city: "",
  joinedAt: "",
  color: "#146485",
};

export default function Profile() {
  const { updateProfile, currentClientId, clients } = useApp();
  const client = clients.find((c) => c.id === currentClientId) ?? emptyClient;
  const [form, setForm] = useState({
    name: client.name,
    professionalName: client.professionalName,
    document: client.document,
    birthDate: client.birthDate,
    phone: client.phone,
    whatsapp: client.whatsapp,
    email: client.email,
    profession: client.profession,
    registry: client.registry,
    experience: "11 anos",
    bio: "Psicóloga clínica com atuação em terapia cognitivo-comportamental, atendimento de adultos e acompanhamento de quadros de ansiedade e estresse. Atuo de forma humanizada, com foco em resultados e acolhimento.",
    modality: client.modality as Modality,
    patientsPerMonth: "24",
    hoursPerMonth: "30",
    sessionDuration: "50 minutos",
    zip: "01310-100",
    street: "Avenida Paulista",
    number: "1578",
    complement: "Sala 12",
    district: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  });
  const [specialties, setSpecialties] = useState<string[]>(client.specialties);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [days, setDays] = useState<string[]>(["Seg", "Qua", "Qui"]);
  const [shift, setShift] = useState<string[]>(["Tarde"]);
  const [notify, setNotify] = useState({ email: true, whats: true, push: false });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const age = Math.floor((Date.now() - new Date(form.birthDate).getTime()) / 31557600000);

  const toggleIn = (arr: string[], v: string, setter: (x: string[]) => void) =>
    setter(arr.includes(v) ? arr.filter((a) => a !== v) : [...arr, v]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">Meu Perfil</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Mantenha seus dados atualizados para agilizar contratos e reservas.
        </p>
      </div>

      {/* hero */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative">
                <Avatar name={client.name} size={84} color="#1c7fa3" ring />
                <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-brand-600 text-white">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="pb-1">
                <h2 className="text-[18px] font-extrabold tracking-tight text-ink">{form.professionalName}</h2>
                <p className="text-[13px] text-muted">{form.profession} · {form.registry}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green" dot>
                Cadastro completo
              </Badge>
              <Badge tone="brand">{client.plan}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <SectionTitle title="Informações pessoais" subtitle="Dados civis e de contato" icon={<User className="h-[18px] w-[18px]" />} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo">
                <Input value={form.name} onChange={set("name")} />
              </Field>
              <Field label="Nome profissional">
                <Input value={form.professionalName} onChange={set("professionalName")} />
              </Field>
              <Field label="CPF">
                <Input value={form.document} onChange={set("document")} />
              </Field>
              <Field label="Data de nascimento">
                <Input type="date" value={form.birthDate} onChange={set("birthDate")} />
              </Field>
              <Field label="Idade" hint="Calculada automaticamente">
                <Input value={`${age} anos`} readOnly className="cursor-default opacity-70" />
              </Field>
              <Field label="Telefone">
                <Input value={form.phone} onChange={set("phone")} />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsapp} onChange={set("whatsapp")} />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={form.email} onChange={set("email")} />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Informações profissionais" subtitle="Registro, especialidades e apresentação" icon={<Stethoscope className="h-[18px] w-[18px]" />} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Profissão">
                <Select value={form.profession} onChange={set("profession")}>
                  <option>Psicólogo clínico</option>
                  <option>Psicóloga clínica</option>
                  <option>Psicopedagogo</option>
                  <option>Terapeuta ocupacional</option>
                  <option>Fonoaudiólogo</option>
                  <option>Psicanalista</option>
                </Select>
              </Field>
              <Field label="CRP / Registro profissional">
                <Input value={form.registry} onChange={set("registry")} />
              </Field>
              <Field label="Tempo de atuação">
                <Input value={form.experience} onChange={set("experience")} />
              </Field>
              <Field label="Adicionar especialidade">
                <div className="flex gap-2">
                  <Input
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    placeholder="Ex.: Terapia de casal"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && specialtyInput.trim()) {
                        e.preventDefault();
                        setSpecialties([...specialties, specialtyInput.trim()]);
                        setSpecialtyInput("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (specialtyInput.trim()) {
                        setSpecialties([...specialties, specialtyInput.trim()]);
                        setSpecialtyInput("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">Especialidades</p>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s) => (
                    <button key={s} onClick={() => setSpecialties(specialties.filter((x) => x !== s))}>
                      <Badge tone="brand" className="cursor-pointer hover:bg-rose-50 hover:text-rose-600">
                        {s} ✕
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Field label="Descrição profissional">
                  <TextArea value={form.bio} onChange={set("bio")} />
                </Field>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Informações de atendimento" subtitle="Como você pretende utilizar as salas" icon={<Sparkles className="h-[18px] w-[18px]" />} />
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">Modalidade</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    ["presencial", "Presencial", "Atendimentos no espaço físico"],
                    ["online", "Online", "Atendimentos remotos"],
                    ["hibrido", "Híbrido", "Presencial e online"],
                  ] as [Modality, string, string][]).map(([k, label, desc]) => (
                    <button
                      key={k}
                      onClick={() => setForm((f) => ({ ...f, modality: k }))}
                      className={cx(
                        "rounded-2xl border p-4 text-left transition-all duration-200",
                        form.modality === k
                          ? "border-brand-600 bg-brand-50/70 shadow-[0_10px_24px_-16px_rgba(20,100,133,.9)] dark:bg-brand-500/10"
                          : "border-line bg-surface hover:border-brand-300",
                      )}
                    >
                      <p className="text-[13.5px] font-bold text-ink">{label}</p>
                      <p className="mt-0.5 text-[12px] text-muted">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Pacientes por mês">
                  <Input value={form.patientsPerMonth} onChange={set("patientsPerMonth")} />
                </Field>
                <Field label="Horas de atendimento/mês">
                  <Input value={form.hoursPerMonth} onChange={set("hoursPerMonth")} />
                </Field>
                <Field label="Duração média do atendimento">
                  <Select value={form.sessionDuration} onChange={set("sessionDuration")}>
                    <option>30 minutos</option>
                    <option>50 minutos</option>
                    <option>1 hora</option>
                    <option>1h30</option>
                  </Select>
                </Field>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">
                  Dias preferenciais
                </p>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((d) => (
                    <Chip key={d} active={days.includes(d)} onClick={() => toggleIn(days, d, setDays)}>
                      {d}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-faint">
                  Horários preferenciais
                </p>
                <div className="flex flex-wrap gap-2">
                  {periods.map((p) => (
                    <Chip key={p} active={shift.includes(p)} onClick={() => toggleIn(shift, p, setShift)}>
                      {p}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Endereço" subtitle="Utilizado para contratos e correspondências" icon={<MapPin className="h-[18px] w-[18px]" />} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="CEP">
                <Input value={form.zip} onChange={set("zip")} />
              </Field>
              <Field label="Rua" className="sm:col-span-2">
                <Input value={form.street} onChange={set("street")} />
              </Field>
              <Field label="Número">
                <Input value={form.number} onChange={set("number")} />
              </Field>
              <Field label="Complemento" className="sm:col-span-2">
                <Input value={form.complement} onChange={set("complement")} />
              </Field>
              <Field label="Bairro">
                <Input value={form.district} onChange={set("district")} />
              </Field>
              <Field label="Cidade">
                <Input value={form.city} onChange={set("city")} />
              </Field>
              <Field label="Estado">
                <Select value={form.state} onChange={set("state")}>
                  {["SP", "RJ", "MG", "PR", "SC", "RS", "BA", "PE"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>
        </div>

        {/* side */}
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Resumo do cadastro" icon={<Building2 className="h-[18px] w-[18px]" />} />
            <div className="space-y-3">
              {[
                ["Plano", client.plan],
                ["Horas contratadas", `${client.monthlyHours}h/mês`],
                ["Horas utilizadas", `${client.usedHours}h`],
                ["Modalidade", form.modality],
                ["Registro", form.registry],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line pb-2.5 last:border-0">
                  <span className="text-[12.5px] text-muted">{k}</span>
                  <span className="text-[12.5px] font-bold capitalize text-ink">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Preferências de aviso" />
            <div className="space-y-4">
              <Toggle checked={notify.email} onChange={(v) => setNotify({ ...notify, email: v })} label="E-mail" />
              <Toggle checked={notify.whats} onChange={(v) => setNotify({ ...notify, whats: v })} label="WhatsApp" />
              <Toggle checked={notify.push} onChange={(v) => setNotify({ ...notify, push: v })} label="Notificações push" />
            </div>
          </Card>

          <div className="sticky top-24">
            <Button
              size="lg"
              className="w-full"
              icon={<Save className="h-[18px] w-[18px]" />}
              onClick={() =>
                updateProfile({
                  name: form.name,
                  phone: form.phone,
                  profession: form.profession,
                  registrationNumber: form.registry,
                  specialties,
                  serviceType:
                    form.modality === "online" ? "ONLINE" : form.modality === "hibrido" ? "HIBRIDO" : "PRESENCIAL",
                  birthDate: form.birthDate || undefined,
                })
              }
            >
              Salvar alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
