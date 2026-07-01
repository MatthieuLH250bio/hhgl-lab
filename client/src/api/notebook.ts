import { apiFetch } from "./client";

export interface Project {
  id: string;
  code: string;
  name: string;
  color: string;
  status: string;
  owner_id: string | null;
}

export interface Experiment {
  id: string;
  project_id: string;
  code: string;
  title: string;
  status: string;
  locked_at: string | null;
  locked_by_id: string | null;
}

export interface EntryListItem {
  id: string;
  code: string;
  title: string;
  entry_date: string;
  tags: string[] | null;
  is_locked: boolean;
  experiment_id: string;
  created_at: string;
}

export interface EntryResult {
  id: string;
  entry_id: string;
  key: string;
  label: string;
  value_num: string | null;
  value_text: string | null;
  unit: string | null;
  tone: string;
}

export interface EntryAttachment {
  id: string;
  entry_id: string;
  kind: string;
  filename: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  caption: string | null;
  storage_path: string;
  thumbnail_path: string | null;
}

export interface Entry {
  id: string;
  experiment_id: string;
  protocol_id: string | null;
  protocol_code: string | null;
  protocol_title: string | null;
  code: string;
  title: string;
  body_md: string | null;
  entry_date: string;
  tags: string[] | null;
  is_locked: boolean;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  results: EntryResult[];
  attachments: EntryAttachment[];
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const d = (err as { detail?: unknown }).detail;
    if (Array.isArray(d)) {
      throw new Error(d.map((e: { loc?: string[]; msg?: string }) => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join(", "));
    }
    throw new Error(typeof d === "string" ? d : `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Projects
export const listProjects = async (): Promise<Project[]> =>
  json(await apiFetch("/api/projects"));

export const createProject = async (data: { code: string; name: string; color?: string }): Promise<Project> =>
  json(await apiFetch("/api/projects", { method: "POST", body: JSON.stringify(data) }));

export const updateProject = async (id: string, data: Partial<Project>): Promise<Project> =>
  json(await apiFetch(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }));

export const deleteProject = async (id: string): Promise<void> => {
  const res = await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
};

// Experiments
export const listExperiments = async (projectId: string): Promise<Experiment[]> =>
  json(await apiFetch(`/api/projects/${projectId}/experiments`));

export const createExperiment = async (data: { project_id: string; code: string; title: string }): Promise<Experiment> =>
  json(await apiFetch("/api/experiments", { method: "POST", body: JSON.stringify(data) }));

export const getExperiment = async (id: string): Promise<Experiment> =>
  json(await apiFetch(`/api/experiments/${id}`));

export const deleteExperiment = async (id: string): Promise<void> => {
  const res = await apiFetch(`/api/experiments/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
};

export const lockExperiment = async (id: string): Promise<Experiment> =>
  json(await apiFetch(`/api/experiments/${id}/lock`, { method: "POST" }));

// Entries
export const listEntries = async (expId: string): Promise<EntryListItem[]> =>
  json(await apiFetch(`/api/experiments/${expId}/entries`));

export const getEntry = async (id: string): Promise<Entry> =>
  json(await apiFetch(`/api/entries/${id}`));

export interface EntryHistory {
  id: string;
  entry_id: string;
  user_id: string | null;
  user_name: string | null;
  action: "created" | "updated" | "locked";
  changed_fields: Record<string, string> | null;
  created_at: string;
}

export const getEntryHistory = async (id: string): Promise<EntryHistory[]> =>
  json(await apiFetch(`/api/entries/${id}/history`));

export const createEntry = async (data: {
  experiment_id: string;
  code: string;
  title: string;
  body_md?: string | null;
  entry_date: string;
  tags?: string[];
  protocol_id?: string | null;
}): Promise<Entry> =>
  json(await apiFetch("/api/entries", { method: "POST", body: JSON.stringify(data) }));

export const updateEntry = async (id: string, data: {
  title?: string;
  body_md?: string;
  entry_date?: string;
  tags?: string[];
  protocol_id?: string | null;
}): Promise<Entry> =>
  json(await apiFetch(`/api/entries/${id}`, { method: "PATCH", body: JSON.stringify(data) }));

export const deleteEntry = async (id: string): Promise<void> => {
  const res = await apiFetch(`/api/entries/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
};

export const lockEntry = async (id: string): Promise<Entry> =>
  json(await apiFetch(`/api/entries/${id}/lock`, { method: "POST" }));

// Results
export const addResult = async (entryId: string, data: {
  key: string; label: string; value_num?: number; value_text?: string; unit?: string; tone?: string;
}): Promise<EntryResult> =>
  json(await apiFetch(`/api/entries/${entryId}/results`, { method: "POST", body: JSON.stringify(data) }));

export const updateResult = async (entryId: string, resultId: string, data: {
  label?: string; value_num?: number | null; value_text?: string | null; unit?: string | null; tone?: string;
}): Promise<EntryResult> =>
  json(await apiFetch(`/api/entries/${entryId}/results/${resultId}`, { method: "PATCH", body: JSON.stringify(data) }));

export const deleteResult = async (entryId: string, resultId: string): Promise<void> => {
  const res = await apiFetch(`/api/entries/${entryId}/results/${resultId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
};
