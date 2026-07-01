import { apiFetch } from "./client";

export interface Collection {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface Reference {
  id: string;
  title: string;
  authors: string[];
  journal: string | null;
  year: number | null;
  doi: string | null;
  abstract: string | null;
  pdf_path: string | null;
  tags: string[];
  notes: string | null;
  added_by_id: string | null;
  collections: Collection[];
  created_at: string;
  updated_at: string;
}

export interface ReferenceCreate {
  title: string;
  authors?: string[];
  journal?: string | null;
  year?: number | null;
  doi?: string | null;
  abstract?: string | null;
  tags?: string[];
  notes?: string | null;
}

export interface DoiLookupResult {
  title: string;
  authors: string[];
  journal: string | null;
  year: number | null;
  doi: string;
  abstract: string | null;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body?.detail;
    if (Array.isArray(detail)) {
      const msg = detail
        .map((e: { loc?: string[]; msg?: string }) => `${e.loc?.slice(-1)[0] ?? "champ"}: ${e.msg ?? "erreur"}`)
        .join(", ");
      throw new Error(msg);
    }
    throw new Error(typeof detail === "string" ? detail : `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── References ────────────────────────────────────────────────────────────────

export const listReferences = (q = "", collectionId?: string | null) => {
  const params = new URLSearchParams({ q });
  if (collectionId) params.set("collection_id", collectionId);
  return apiFetch(`/api/references?${params}`).then((r) => json<Reference[]>(r));
};

export const getReference = (id: string) =>
  apiFetch(`/api/references/${id}`).then((r) => json<Reference>(r));

export const createReference = (body: ReferenceCreate) =>
  apiFetch("/api/references", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => json<Reference>(r));

export const updateReference = (id: string, body: Partial<ReferenceCreate>) =>
  apiFetch(`/api/references/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => json<Reference>(r));

export const deleteReference = (id: string) =>
  apiFetch(`/api/references/${id}`, { method: "DELETE" }).then((r) => json<void>(r));

export const doiLookup = (doi: string) =>
  apiFetch("/api/references/doi-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doi }),
  }).then((r) => json<DoiLookupResult>(r));

export const uploadPdf = (id: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`/api/references/${id}/pdf`, { method: "POST", body: fd }).then((r) =>
    json<Reference>(r)
  );
};

// ── Collections ───────────────────────────────────────────────────────────────

export const listCollections = () =>
  apiFetch("/api/collections").then((r) => json<Collection[]>(r));

export const createCollection = (body: { name: string; parent_id?: string | null }) =>
  apiFetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => json<Collection>(r));

export const updateCollection = (id: string, body: { name?: string; parent_id?: string | null }) =>
  apiFetch(`/api/collections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => json<Collection>(r));

export const deleteCollection = (id: string) =>
  apiFetch(`/api/collections/${id}`, { method: "DELETE" }).then((r) => json<void>(r));

export const addRefToCollection = (colId: string, refId: string) =>
  apiFetch(`/api/collections/${colId}/refs/${refId}`, { method: "POST" }).then((r) => json<void>(r));

export const removeRefFromCollection = (colId: string, refId: string) =>
  apiFetch(`/api/collections/${colId}/refs/${refId}`, { method: "DELETE" }).then((r) => json<void>(r));
