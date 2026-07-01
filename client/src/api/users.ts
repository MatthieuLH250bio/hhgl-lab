import { apiFetch } from "./client";

export interface UserItem {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
}

export interface UserCreate {
  email: string;
  username: string;
  full_name?: string;
  password: string;
  role?: string;
}

export interface UserUpdate {
  full_name?: string;
  role?: string;
  is_active?: boolean;
  password?: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as { detail?: unknown }).detail;
    throw new Error(typeof detail === "string" ? detail : `Erreur ${res.status}`);
  }
  return res.json();
}

export const listUsers = async (): Promise<UserItem[]> =>
  json(await apiFetch("/api/users"));

export const createUser = async (data: UserCreate): Promise<UserItem> =>
  json(await apiFetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }));

export const updateUser = async (id: string, data: UserUpdate): Promise<UserItem> =>
  json(await apiFetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }));

export interface MeUpdate {
  full_name?: string;
  password?: string;
}

export const getMe = async (): Promise<UserItem> =>
  json(await apiFetch("/api/users/me"));

export const updateMe = async (data: MeUpdate): Promise<UserItem> =>
  json(await apiFetch("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }));
