export type RoomAddress = {
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
};

export function formatRoomAddress(addr: RoomAddress) {
  const street = [addr.street?.trim(), addr.number?.trim()].filter(Boolean).join(", ");
  const extra = [addr.complement?.trim(), addr.neighborhood?.trim()].filter(Boolean).join(" · ");
  const city = [addr.city?.trim(), addr.state?.trim()].filter(Boolean).join("/");
  const zip = addr.zipCode?.trim();
  return [street, extra, city, zip].filter(Boolean).join(" — ");
}

export async function lookupCep(cep: string): Promise<Partial<RoomAddress> | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) return null;
  const data = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
  if (data.erro) return null;
  return {
    street: data.logradouro ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade ?? "",
    state: data.uf ?? "",
  };
}
