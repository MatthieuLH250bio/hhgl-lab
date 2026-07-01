import { apiFetch } from "./client";

export async function listResource(path: string, params: Record<string, string> = {}): Promise<unknown[]> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  const res = await apiFetch(`/api/${path}${qs ? "?" + qs : ""}`);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json();
}

export async function getResource(path: string, id: string): Promise<unknown> {
  const res = await apiFetch(`/api/${path}/${id}`);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json();
}

export async function createResource(path: string, data: Record<string, unknown>): Promise<unknown> {
  const res = await apiFetch(`/api/${path}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    if (Array.isArray(detail)) {
      const msg = detail.map((e: { loc?: string[]; msg?: string }) =>
        `${e.loc?.slice(-1)[0] ?? "champ"}: ${e.msg ?? "erreur"}`
      ).join(", ");
      throw new Error(msg);
    }
    throw new Error(typeof detail === "string" ? detail : `Erreur ${res.status}`);
  }
  return res.json();
}

export async function updateResource(path: string, id: string, data: Record<string, unknown>): Promise<unknown> {
  const res = await apiFetch(`/api/${path}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    if (Array.isArray(detail)) {
      const msg = detail.map((e: { loc?: string[]; msg?: string }) =>
        `${e.loc?.slice(-1)[0] ?? "champ"}: ${e.msg ?? "erreur"}`
      ).join(", ");
      throw new Error(msg);
    }
    throw new Error(typeof detail === "string" ? detail : `Erreur ${res.status}`);
  }
  return res.json();
}

export async function deleteResource(path: string, id: string): Promise<void> {
  const res = await apiFetch(`/api/${path}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
}
