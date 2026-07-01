import { apiFetch } from "./client";

export interface ProtocolVersion {
  id: string;
  protocol_id: string;
  version: number;
  created_at: string;
}

export interface Protocol {
  id: string;
  code: string;
  title: string;
  category: string | null;
  duration: string | null;
  body_html: string | null;
  version: number;
  tags: string[];
  is_favorite: boolean;
  author_name: string | null;
  created_at: string;
  updated_at: string;
  versions: ProtocolVersion[];
}

export interface ProtocolCreate {
  title: string;
  category?: string | null;
  duration?: string | null;
  body_html?: string | null;
  tags?: string[];
  author_name?: string | null;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body?.detail;
    if (Array.isArray(detail)) {
      throw new Error(detail.map((e: { loc?: string[]; msg?: string }) =>
        `${e.loc?.slice(-1)[0] ?? "champ"}: ${e.msg ?? "erreur"}`).join(", "));
    }
    throw new Error(typeof detail === "string" ? detail : `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const listProtocols = (q = "", category?: string | null, favorites?: boolean) => {
  const p = new URLSearchParams({ q });
  if (category) p.set("category", category);
  if (favorites) p.set("favorites", "true");
  return apiFetch(`/api/protocols?${p}`).then((r) => json<Protocol[]>(r));
};

export const getProtocol = (id: string) =>
  apiFetch(`/api/protocols/${id}`).then((r) => json<Protocol>(r));

export const createProtocol = (body: ProtocolCreate) =>
  apiFetch("/api/protocols", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => json<Protocol>(r));

export const updateProtocol = (id: string, body: Partial<ProtocolCreate> & { is_favorite?: boolean }) =>
  apiFetch(`/api/protocols/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => json<Protocol>(r));

export const deleteProtocol = (id: string) =>
  apiFetch(`/api/protocols/${id}`, { method: "DELETE" }).then((r) => json<void>(r));

export const restoreVersion = (id: string, version: number) =>
  apiFetch(`/api/protocols/${id}/restore/${version}`, { method: "POST" }).then((r) => json<Protocol>(r));
