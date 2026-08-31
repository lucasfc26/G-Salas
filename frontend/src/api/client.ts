const API_BASE = "/api/v1";

const ACCESS_KEY = "gsalas.accessToken";
const REFRESH_KEY = "gsalas.refreshToken";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY) ?? localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY) ?? localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string, persist: boolean) {
  const store = persist ? localStorage : sessionStorage;
  const other = persist ? sessionStorage : localStorage;
  store.setItem(ACCESS_KEY, accessToken);
  store.setItem(REFRESH_KEY, refreshToken);
  other.removeItem(ACCESS_KEY);
  other.removeItem(REFRESH_KEY);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

type Envelope<T> = {
  success: boolean;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
  error?: { code?: string; message?: string };
};

async function parse<T>(res: Response): Promise<{ data: T; meta?: Envelope<T>["meta"] }> {
  if (res.status === 204) return { data: undefined as T };
  const body = (await res.json()) as Envelope<T>;
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error?.message ?? "Não foi possível concluir a solicitação.", res.status, body.error?.code);
  }
  return { data: body.data, meta: body.meta };
}

let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshing) {
    refreshing = (async () => {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const { data } = await parse<{ accessToken: string; refreshToken: string }>(res);
      const persist = Boolean(localStorage.getItem(ACCESS_KEY));
      setTokens(data.accessToken, data.refreshToken, persist);
      return true;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && retry && getRefreshToken()) {
    const ok = await refreshAccessToken();
    if (ok) return api<T>(path, init, false);
  }
  const { data } = await parse<T>(res);
  return data;
}

export async function apiList<T>(path: string, init: RequestInit = {}): Promise<T[]> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && getRefreshToken()) {
    const ok = await refreshAccessToken();
    if (ok) return apiList<T>(path, init);
  }
  const { data } = await parse<T[]>(res);
  return Array.isArray(data) ? data : [];
}
