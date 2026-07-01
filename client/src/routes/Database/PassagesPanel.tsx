import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../api/client";
import { toast } from "../../stores/toast";

interface Passage {
  id: string;
  cell_line_id: string;
  passage_number: number;
  passage_date: string;
  operator_name: string | null;
  viability: number | null;
  seeding_density: number | null;
  flask_type: string | null;
  notes: string | null;
  created_at: string;
}

async function fetchPassages(cellLineId: string): Promise<Passage[]> {
  const res = await apiFetch(`/api/cell-lines/${cellLineId}/passages`);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json();
}

async function addPassage(cellLineId: string, data: Omit<Passage, "id" | "cell_line_id" | "created_at">): Promise<Passage> {
  const res = await apiFetch(`/api/cell-lines/${cellLineId}/passages`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `Erreur ${res.status}`);
  }
  return res.json();
}

async function deletePassage(cellLineId: string, passageId: string): Promise<void> {
  const res = await apiFetch(`/api/cell-lines/${cellLineId}/passages/${passageId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
}

function viabilityColor(v: number | null): string {
  if (v === null) return "var(--fg-subtle)";
  if (v >= 85) return "var(--success)";
  if (v >= 70) return "var(--warning)";
  return "var(--danger)";
}

const FLASK_TYPES = ["T25", "T75", "T175", "6-well", "12-well", "24-well", "Dish 60mm", "Dish 100mm"];

const today = () => new Date().toISOString().slice(0, 10);

export default function PassagesPanel({ cellLineId, currentPassage }: { cellLineId: string; currentPassage: number | null }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    passage_number: (currentPassage ?? 0) + 1,
    passage_date: today(),
    operator_name: "",
    viability: "",
    seeding_density: "",
    flask_type: "T75",
    notes: "",
  });

  const query = useQuery<Passage[]>({
    queryKey: ["cell-line-passages", cellLineId],
    queryFn: () => fetchPassages(cellLineId),
    staleTime: 30_000,
  });

  const addMut = useMutation({
    mutationFn: () => addPassage(cellLineId, {
      passage_number: form.passage_number,
      passage_date: form.passage_date,
      operator_name: form.operator_name || null,
      viability: form.viability !== "" ? parseFloat(form.viability) : null,
      seeding_density: form.seeding_density !== "" ? parseFloat(form.seeding_density) : null,
      flask_type: form.flask_type || null,
      notes: form.notes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cell-line-passages", cellLineId] });
      qc.invalidateQueries({ queryKey: ["db", "cell-lines"] });
      qc.invalidateQueries({ queryKey: ["db-item", "cell-lines", cellLineId] });
      setAdding(false);
      setForm(f => ({ ...f, passage_number: f.passage_number + 1, viability: "", seeding_density: "", notes: "" }));
      toast.success("Passage enregistré");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePassage(cellLineId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cell-line-passages", cellLineId] });
      toast.success("Passage supprimé");
    },
  });

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--fg)",
    borderRadius: 4,
    fontSize: 11,
    padding: "4px 7px",
    outline: "none",
    width: "100%",
  } as const;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
          Passages cellulaires
        </span>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded px-2 py-0.5 text-xs font-semibold"
            style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer" }}
          >
            + Passage
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div
          className="flex flex-col gap-2 rounded-lg p-3"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--fg-subtle)" }}>Passage #</label>
              <input
                type="number"
                min={1}
                value={form.passage_number}
                onChange={e => setForm(f => ({ ...f, passage_number: parseInt(e.target.value) || 1 }))}
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--fg-subtle)" }}>Date</label>
              <input
                type="date"
                value={form.passage_date}
                onChange={e => setForm(f => ({ ...f, passage_date: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--fg-subtle)" }}>Viabilité (%)</label>
              <input
                type="number"
                min={0} max={100} step={0.1}
                placeholder="ex : 95"
                value={form.viability}
                onChange={e => setForm(f => ({ ...f, viability: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--fg-subtle)" }}>Flacon</label>
              <select
                value={form.flask_type}
                onChange={e => setForm(f => ({ ...f, flask_type: e.target.value }))}
                style={inputStyle}
              >
                {FLASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--fg-subtle)" }}>Densité (c/cm²)</label>
              <input
                type="number"
                step="any"
                placeholder="ex : 5000"
                value={form.seeding_density}
                onChange={e => setForm(f => ({ ...f, seeding_density: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--fg-subtle)" }}>Opérateur</label>
              <input
                type="text"
                placeholder="Nom"
                value={form.operator_name}
                onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--fg-subtle)" }}>Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => addMut.mutate()}
              disabled={addMut.isPending}
              className="rounded px-3 py-1 text-xs font-semibold"
              style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer" }}
            >
              {addMut.isPending ? "…" : "Enregistrer"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded px-3 py-1 text-xs"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Passages list */}
      {query.isLoading && (
        <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>Chargement…</p>
      )}
      {query.data?.length === 0 && !adding && (
        <p className="text-xs italic" style={{ color: "var(--fg-subtle)" }}>Aucun passage enregistré.</p>
      )}
      {query.data?.map((p) => (
        <div
          key={p.id}
          className="flex items-start gap-2 rounded-lg px-3 py-2"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          {/* Passage number badge */}
          <span
            className="rounded px-1.5 py-0.5 text-xs font-bold shrink-0"
            style={{ background: "var(--primary-soft)", color: "var(--primary)", fontFamily: "var(--font-mono)" }}
          >
            P{p.passage_number}
          </span>

          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                {new Date(p.passage_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              {p.viability !== null && (
                <span
                  className="text-xs font-semibold"
                  style={{ color: viabilityColor(p.viability) }}
                >
                  ⬤ {p.viability.toFixed(0)}%
                </span>
              )}
              {p.flask_type && (
                <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>{p.flask_type}</span>
              )}
              {p.operator_name && (
                <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>— {p.operator_name}</span>
              )}
            </div>
            {p.seeding_density !== null && (
              <span className="text-xs" style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-mono)" }}>
                {p.seeding_density.toLocaleString("fr-FR")} c/cm²
              </span>
            )}
            {p.notes && (
              <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>{p.notes}</p>
            )}
          </div>

          <button
            onClick={() => { if (confirm(`Supprimer le passage P${p.passage_number} ?`)) deleteMut.mutate(p.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: 13, flexShrink: 0 }}
            title="Supprimer ce passage"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
