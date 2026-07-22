// Typed fetch helpers for the /api backend (proxied by vite in dev).

export type Role =
  | "pricing_owner"
  | "sales"
  | "deal_desk"
  | "delivery"
  | "leadership";

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  is_builder: boolean;
}

export interface Offering {
  id: number;
  preset_key: string;
  name: string;
  tagline: string | null;
  unit: string;
  unit_plural: string;
  deal_currency: string;
  status: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, payload?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

// ——— Auth ———
export const auth = {
  me: () => apiGet<{ user: User }>("/auth/me"),
  users: () => apiGet<{ users: User[] }>("/auth/users"),
  login: (user_id: number) => apiPost<{ user: User }>("/auth/login", { user_id }),
  logout: () => apiPost<{ ok: true }>("/auth/logout"),
};

// ——— Offerings (placeholder — feature phases extend this) ———
export const offerings = {
  list: () => apiGet<{ offerings: Offering[] }>("/offerings"),
};
