export const EMAIL_PATTERN = /^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function maskPhone(value: string) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isPhoneComplete(value: string) {
  const n = digitsOnly(value).length;
  return n === 0 || n === 10 || n === 11;
}

export function maskEmail(value: string) {
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

export function maskCpf(value: string) {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCnpj(value: string) {
  const d = digitsOnly(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** CPF while typing up to 11 digits; CNPJ from the 12th. */
export function maskCpfCnpj(value: string) {
  return digitsOnly(value).length > 11 ? maskCnpj(value) : maskCpf(value);
}

export function maskCep(value: string) {
  const d = digitsOnly(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
