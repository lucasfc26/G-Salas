import { useMemo, useState } from "react";
import {
  ArrowLeft,
  DoorOpen,
  ImagePlus,
  Loader2,
  MapPin,
  Save,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useApp } from "../../store";
import {
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Input,
  SectionTitle,
  Select,
  TextArea,
  cx,
} from "../../components/ui";
import { ROOM_AMENITIES, ROOM_AMENITY_ICONS } from "../../data/room-amenities";
import { money } from "../../data/mock";
import { digitsOnly, maskCep } from "../../utils/masks";
import { formatRoomAddress, lookupCep } from "../../utils/room-address";
import { compressPhotos } from "../../utils/compress-photo";

const ROOM_TYPES = [
  "Consultório individual",
  "Consultório premium",
  "Sala de grupo",
  "Terapia",
  "Reunião",
  "Multiprofissional",
];

const STATES = ["SP", "RJ", "MG", "PR", "SC", "RS", "BA", "PE", "DF", "GO", "ES", "CE"];

export default function RoomForm({ roomId }: { roomId?: string }) {
  const { navigate, rooms, createRoom, updateRoomDetails, uploadRoomPhotos, deleteRoomPhoto } = useApp();
  const room = roomId ? rooms.find((r) => r.id === roomId) : undefined;
  const isEdit = Boolean(room);

  const [name, setName] = useState(room?.name ?? "");
  const [description, setDescription] = useState(room?.description ?? "");
  const [type, setType] = useState(room?.type && ROOM_TYPES.includes(room.type) ? room.type : room?.type || "Consultório individual");
  const [capacity, setCapacity] = useState(room?.capacity ?? 2);
  const [hourlyPrice, setHourlyPrice] = useState(room?.hourlyPrice ?? 0);
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [zipCode, setZipCode] = useState(maskCep(room?.zipCode ?? ""));
  const [street, setStreet] = useState(room?.street ?? "");
  const [number, setNumber] = useState(room?.number ?? "");
  const [complement, setComplement] = useState(room?.complement ?? "");
  const [neighborhood, setNeighborhood] = useState(room?.neighborhood ?? "");
  const [city, setCity] = useState(room?.city ?? "");
  const [state, setState] = useState(room?.state || "");
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string }[]>([]);
  const [drag, setDrag] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [lookup, setLookup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && capacity > 0 && hourlyPrice >= 0;
  const addressPreview = formatRoomAddress({ zipCode, street, number, complement, neighborhood, city, state });
  const coverPreview = pendingFiles[0]?.preview ?? room?.photo;

  const payload = useMemo(
    () => ({
      name: name.trim(),
      description: description.trim() || undefined,
      type: type.trim() || undefined,
      capacity: Number(capacity),
      hourlyPrice: Number(hourlyPrice),
      amenities,
      zipCode: zipCode.trim() || undefined,
      street: street.trim() || undefined,
      number: number.trim() || undefined,
      complement: complement.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
    }),
    [name, description, type, capacity, hourlyPrice, amenities, zipCode, street, number, complement, neighborhood, city, state],
  );

  const toggleAmenity = (tag: string) => {
    setAmenities((prev) => (prev.includes(tag) ? prev.filter((a) => a !== tag) : [...prev, tag]));
  };

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    setCompressing(true);
    setError(null);
    try {
      const { files: compressed, errors } = await compressPhotos(files);
      if (errors.length) setError(errors[0]);
      const list = compressed.map((file) => ({ file, preview: URL.createObjectURL(file) }));
      setPendingFiles((prev) => [...prev, ...list]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível comprimir as fotos.");
    } finally {
      setCompressing(false);
    }
  };

  const uploadExistingPhotos = async (files: FileList | File[] | null) => {
    if (!room || !files) return;
    setCompressing(true);
    setError(null);
    try {
      const { files: compressed, errors } = await compressPhotos(files);
      if (errors.length) setError(errors[0]);
      if (!compressed.length) return;
      setUploadingPhotos(true);
      await uploadRoomPhotos(room.id, compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar as fotos.");
    } finally {
      setCompressing(false);
      setUploadingPhotos(false);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const fillFromCep = async (value: string) => {
    const masked = maskCep(value);
    setZipCode(masked);
    if (digitsOnly(masked).length !== 8) return;
    setLookup(true);
    try {
      const found = await lookupCep(masked);
      if (!found) return;
      setStreet(found.street || "");
      setNeighborhood(found.neighborhood || "");
      setCity(found.city || "");
      setState(found.state || "SP");
    } finally {
      setLookup(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSaving(true);
    try {
      if (isEdit && room) {
        await updateRoomDetails(room.id, payload);
        if (pendingFiles.length) {
          await uploadRoomPhotos(
            room.id,
            pendingFiles.map((p) => p.file),
          );
          setPendingFiles([]);
        }
        navigate("rooms");
      } else {
        const id = await createRoom(payload);
        if (pendingFiles.length) {
          await uploadRoomPhotos(
            id,
            pendingFiles.map((p) => p.file),
          );
          setPendingFiles([]);
        }
        navigate("rooms");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a sala.");
    } finally {
      setSaving(false);
    }
  };

  if (roomId && !room) {
    return (
      <div className="space-y-5">
        <Button type="button" variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate("rooms")}>
          Voltar para salas
        </Button>
        <Card className="p-10 text-center text-[13px] text-muted">Sala não encontrada.</Card>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Button type="button" variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate("rooms")}>
        Voltar para salas
      </Button>

      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">
          {isEdit ? "Editar sala" : "Nova sala"}
        </h1>
        <p className="mt-1 text-[13.5px] text-muted">
          {isEdit
            ? "Atualize as informações exibidas para o profissional na reserva."
            : "Cadastre a sala com fotos, endereço e características. O cliente vê estes dados na agenda."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle
              title="Fotos da sala"
              subtitle="A primeira foto vira a capa na agenda e no card"
              icon={<ImagePlus className="h-[18px] w-[18px]" />}
            />

            {isEdit && room && room.photos.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {room.photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
                    <img src={photo.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => deleteRoomPhoto(room.id, photo.id)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remover foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingFiles.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {pendingFiles.map((p, i) => (
                  <div key={p.preview} className="group relative aspect-square overflow-hidden rounded-xl border border-dashed border-brand-300">
                    <img src={p.preview} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (isEdit && room) void uploadExistingPhotos(e.dataTransfer.files);
                else void addFiles(e.dataTransfer.files);
              }}
              className={cx(
                "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all",
                drag ? "border-brand-500 bg-brand-50/60 dark:bg-brand-500/10" : "border-line bg-surface-2/40",
              )}
            >
              <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                {uploadingPhotos || compressing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              </span>
              <p className="text-[13.5px] font-bold text-ink">
                {compressing ? "Comprimindo fotos..." : "Arraste as fotos da sala"}
              </p>
              <p className="mt-0.5 text-[12.5px] text-muted">ou selecione do computador</p>
              <label className="mt-3 cursor-pointer rounded-xl bg-brand-600 px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_8px_18px_-10px_rgba(20,100,133,.9)]">
                Selecionar fotos
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (isEdit && room) void uploadExistingPhotos(e.target.files);
                    else void addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="mt-2 text-[11px] text-faint">JPG, PNG ou WebP · até 50 MB cada · comprimidas automaticamente</p>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle
              title="Cadastro da sala"
              subtitle="Nome, tipo e o que o profissional vê na reserva"
              icon={<DoorOpen className="h-[18px] w-[18px]" />}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome da sala" className="sm:col-span-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Sala Serenidade" required />
              </Field>
              <Field label="Tipo">
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                  {ROOM_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Capacidade (pessoas)">
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </Field>
              <Field label="Valor por hora (R$)" className="sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={hourlyPrice}
                  onChange={(e) => setHourlyPrice(Number(e.target.value))}
                />
              </Field>
              <Field label="Descrição" className="sm:col-span-2" hint="Aparece na ficha da sala para o cliente">
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ambiente, indicação de uso, diferenciais..."
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle
              title="Endereço"
              subtitle="Onde a sala fica — exibido na ficha para o profissional"
              icon={<MapPin className="h-[18px] w-[18px]" />}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="CEP" hint={lookup ? "Buscando..." : "Preenche rua e cidade"}>
                <Input
                  inputMode="numeric"
                  value={zipCode}
                  onChange={(e) => void fillFromCep(e.target.value)}
                  placeholder="01310-100"
                  maxLength={9}
                />
              </Field>
              <Field label="Rua" className="sm:col-span-2">
                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Avenida Paulista" />
              </Field>
              <Field label="Número">
                <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="1578" />
              </Field>
              <Field label="Complemento" className="sm:col-span-2">
                <Input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Sala 12 · 3º andar" />
              </Field>
              <Field label="Bairro">
                <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
              </Field>
              <Field label="Cidade">
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </Field>
              <Field label="Estado">
                <Select value={state} onChange={(e) => setState(e.target.value)}>
                  <option value="">UF</option>
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle
              title="O que tem nesta sala"
              subtitle="Toque para marcar. Só o que estiver marcado aparece para o cliente."
              icon={<Tag className="h-[18px] w-[18px]" />}
            />
            <div className="flex flex-wrap gap-2">
              {ROOM_AMENITIES.map((tag) => {
                const Icon = ROOM_AMENITY_ICONS[tag];
                const active = amenities.includes(tag);
                return (
                  <Chip key={tag} active={active} onClick={() => toggleAmenity(tag)}>
                    <span className="inline-flex items-center gap-1.5">
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      {tag}
                    </span>
                  </Chip>
                );
              })}
            </div>
          </Card>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 lg:hidden">
            <Button type="button" variant="ghost" onClick={() => navigate("rooms")}>
              Cancelar
            </Button>
            <Button type="submit" icon={<Save className="h-[18px] w-[18px]" />} disabled={!canSubmit || saving}>
              {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar sala"}
            </Button>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <p className="border-b border-line px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide text-faint">
              Como o cliente vê
            </p>
            <div className="relative h-40 bg-surface-2">
              {coverPreview ? (
                <img src={coverPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-faint">
                  <ImagePlus className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
              <div className="absolute bottom-3 left-3 flex gap-2">
                <Badge tone="green" dot>
                  Disponível
                </Badge>
                <Badge tone="brand">
                  <Users className="mr-1 h-3 w-3" /> {capacity || 1} pessoas
                </Badge>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <h3 className="text-[15px] font-bold text-ink">{name.trim() || "Nome da sala"}</h3>
                <p className="text-[12.5px] text-muted">{type}</p>
              </div>
              {addressPreview && (
                <p className="flex items-start gap-1.5 text-[12.5px] text-muted">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                  {addressPreview}
                </p>
              )}
              {description.trim() && <p className="text-[12.5px] leading-relaxed text-muted">{description.trim()}</p>}
              <p className="text-[13px] font-extrabold text-ink">{money(Number(hourlyPrice) || 0)} / hora</p>
              {amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((a) => {
                    const Icon = ROOM_AMENITY_ICONS[a];
                    return (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted"
                      >
                        {Icon && <Icon className="h-3 w-3" />}
                        {a}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <div className="hidden lg:block">
            <Button type="submit" size="lg" className="w-full" icon={<Save className="h-[18px] w-[18px]" />} disabled={!canSubmit || saving}>
              {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar sala"}
            </Button>
            <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => navigate("rooms")}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
