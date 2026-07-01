import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createResource, updateResource } from "../../../api/database";
import { apiFetch } from "../../../api/client";
import type { Plasmid } from "../../../types/database";
import { KIND_COLORS } from "./PlasmidMap";
import type { ParsedPlasmid } from "./parseGenbank";

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  code: string;
  name: string;
  backbone: string;
  insert_name: string;
  length_bp: string;
  host_strain: string;
  resistance: string;
  sequence: string;
  notes_md: string;
}

const EMPTY_FORM: FormState = {
  code: "", name: "", backbone: "", insert_name: "",
  length_bp: "", host_strain: "", resistance: "",
  sequence: "", notes_md: "",
};

function plasmidToForm(p: Plasmid): FormState {
  return {
    code: p.code ?? "",
    name: p.name ?? "",
    backbone: p.backbone ?? "",
    insert_name: p.insert_name ?? "",
    length_bp: p.length_bp?.toString() ?? "",
    host_strain: p.host_strain ?? "",
    resistance: (p.resistance ?? []).join(", "),
    sequence: p.sequence ?? "",
    notes_md: p.notes_md ?? "",
  };
}

function parsedToForm(p: ParsedPlasmid): FormState {
  // Auto-suggest code from GenBank locus name (sanitised, max 16 chars)
  const codeGuess = p.name.replace(/[^A-Za-z0-9]/g, "_").toUpperCase().slice(0, 16);
  return {
    code: codeGuess,
    name: p.name,
    backbone: "",
    insert_name: "",
    length_bp: p.length_bp?.toString() ?? "",
    host_strain: "",
    resistance: "",
    sequence: p.sequence,
    notes_md: "",
  };
}

function parsedFeaturesToPending(features: ParsedPlasmid["features"]): PendingFeature[] {
  return features.map((f) => ({
    tempId: Math.random().toString(36).slice(2),
    name: f.name,
    kind: f.kind,
    start_bp: f.start_bp.toString(),
    end_bp: f.end_bp.toString(),
    strand: f.strand,
  }));
}

// ── Feature state (local, before save) ───────────────────────────────────────

interface PendingFeature {
  tempId: string;
  name: string;
  kind: string;
  start_bp: string;
  end_bp: string;
  strand: string;
}

const EMPTY_FEAT: Omit<PendingFeature, "tempId"> = {
  name: "", kind: "", start_bp: "", end_bp: "", strand: "",
};

const KINDS = ["cds", "promoter", "terminator", "rbs", "ori", "tag", "misc"];

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  padding: "6px 10px",
  fontSize: 13,
  color: "var(--fg)",
  outline: "none",
  width: "100%",
};

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--fg-subtle)",
  marginBottom: 4,
  display: "block",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  plasmid?: Plasmid;
  imported?: ParsedPlasmid;
  onSaved: (id: string) => void;
  onCancel: () => void;
}

export default function PlasmidForm({ plasmid, imported, onSaved, onCancel }: Props) {
  const qc = useQueryClient();
  const isEdit = !!plasmid;

  const [form, setForm] = useState<FormState>(
    isEdit ? plasmidToForm(plasmid) : imported ? parsedToForm(imported) : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Features: existing ones marked for deletion, new ones pending addition
  const [toDelete, setToDelete] = useState<Set<string>>(new Set());
  const [toAdd, setToAdd] = useState<PendingFeature[]>(
    !isEdit && imported ? parsedFeaturesToPending(imported.features) : []
  );
  const [newFeat, setNewFeat] = useState<Omit<PendingFeature, "tempId">>(EMPTY_FEAT);

  const existingFeatures = (plasmid?.features ?? []).filter(
    (f) => !toDelete.has(f.id)
  );
  const canAddFeat = !!(newFeat.name && newFeat.start_bp && newFeat.end_bp);

  function f(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));
  }

  function addLocalFeature() {
    if (!canAddFeat) return;
    setToAdd((prev) => [
      ...prev,
      { ...newFeat, tempId: Math.random().toString(36).slice(2) },
    ]);
    setNewFeat(EMPTY_FEAT);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setSaveError("Le nom est obligatoire.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = {
        ...(isEdit ? {} : { code: form.code.trim().toUpperCase() || "PLA-NEW" }),
        name: form.name.trim(),
        backbone: form.backbone.trim() || null,
        insert_name: form.insert_name.trim() || null,
        length_bp: form.length_bp ? parseInt(form.length_bp, 10) : null,
        host_strain: form.host_strain.trim() || null,
        resistance: form.resistance
          ? form.resistance.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        sequence: form.sequence.trim() || null,
        notes_md: form.notes_md.trim() || null,
      };

      let plasmidId: string;

      if (isEdit) {
        const updated = (await updateResource(
          "plasmids",
          plasmid.id,
          body
        )) as Plasmid;
        plasmidId = updated.id;
        for (const fId of toDelete) {
          await apiFetch(`/api/plasmids/${plasmidId}/features/${fId}`, {
            method: "DELETE",
          });
        }
      } else {
        const created = (await createResource("plasmids", body)) as Plasmid;
        plasmidId = created.id;
      }

      for (const feat of toAdd) {
        await apiFetch(`/api/plasmids/${plasmidId}/features`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: feat.name,
            kind: feat.kind || null,
            start_bp: parseInt(feat.start_bp, 10),
            end_bp: parseInt(feat.end_bp, 10),
            strand: feat.strand || null,
          }),
        });
      }

      qc.invalidateQueries({ queryKey: ["plasmids"] });
      qc.invalidateQueries({ queryKey: ["plasmid", plasmidId] });
      onSaved(plasmidId);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const ntCount = form.sequence.replace(/[^ACGTacgt]/g, "").length;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      {/* Header */}
      <div
        className="px-8 py-3 shrink-0 flex items-center justify-between gap-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <h1 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
          {isEdit ? `Modifier — ${plasmid.name}` : "Nouveau plasmide"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded px-4 py-1.5 text-sm"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded px-4 py-1.5 text-sm font-medium"
            style={{
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Sauvegarde…" : isEdit ? "Sauvegarder" : "Créer"}
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6"
        style={{ background: "var(--bg)" }}
      >
        {/* Import confirmation banner */}
        {imported && !isEdit && (
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm"
            style={{
              background: "color-mix(in oklab,var(--primary) 8%,transparent)",
              border: "1px solid color-mix(in oklab,var(--primary) 20%,transparent)",
              color: "var(--fg)",
            }}
          >
            <span style={{ fontSize: 18 }}>📂</span>
            <span>
              Importé depuis <strong>{imported.name}</strong> —{" "}
              {imported.features.length} feature{imported.features.length !== 1 ? "s" : ""} détectée{imported.features.length !== 1 ? "s" : ""}.
              Vérifie et corrige si besoin avant de créer.
            </span>
          </div>
        )}

        {saveError && (
          <p
            className="text-xs rounded px-3 py-2"
            style={{
              background: "color-mix(in oklab,var(--danger) 10%,transparent)",
              color: "var(--danger)",
            }}
          >
            {saveError}
          </p>
        )}

        {/* ── Informations ─────────────────────────────────────────────── */}
        <section>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--fg-subtle)" }}
          >
            Informations
          </p>
          {/* Code — only shown when creating */}
          {!isEdit && (
            <div className="flex flex-col gap-1 mb-3">
              <label style={LABEL}>Code *</label>
              <input
                style={{ ...INPUT, fontFamily: "var(--font-mono)", textTransform: "uppercase", maxWidth: 180 }}
                value={form.code}
                onChange={f("code")}
                placeholder="PLA-0001"
                maxLength={16}
              />
            </div>
          )}

          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div className="col-span-2 flex flex-col gap-1">
              <label style={LABEL}>Nom *</label>
              <input
                style={INPUT}
                value={form.name}
                onChange={f("name")}
                placeholder="pUC19, pAAV-CMV-GFP…"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label style={LABEL}>Backbone</label>
              <input
                style={INPUT}
                value={form.backbone}
                onChange={f("backbone")}
                placeholder="pUC19, pBR322…"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label style={LABEL}>Insert</label>
              <input
                style={INPUT}
                value={form.insert_name}
                onChange={f("insert_name")}
                placeholder="GFP, lacZ…"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label style={LABEL}>Taille (bp)</label>
              <input
                style={INPUT}
                type="number"
                value={form.length_bp}
                onChange={f("length_bp")}
                placeholder="2686"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label style={LABEL}>Souche hôte</label>
              <input
                style={INPUT}
                value={form.host_strain}
                onChange={f("host_strain")}
                placeholder="DH5α, BL21…"
              />
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              <label style={LABEL}>Résistances (séparées par virgule)</label>
              <input
                style={INPUT}
                value={form.resistance}
                onChange={f("resistance")}
                placeholder="AmpR, KanR…"
              />
            </div>
          </div>
        </section>

        {/* ── Séquence ─────────────────────────────────────────────────── */}
        <section>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--fg-subtle)" }}
          >
            Séquence
          </p>
          <textarea
            rows={4}
            value={form.sequence}
            onChange={f("sequence")}
            placeholder="ATCGGCTATCGAT…"
            style={{
              ...INPUT,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: 1.7,
              resize: "vertical",
            }}
          />
          {ntCount > 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--fg-subtle)" }}>
              {ntCount.toLocaleString("fr-FR")} nt
            </p>
          )}
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--fg-subtle)" }}
          >
            Features ({existingFeatures.length + toAdd.length})
          </p>

          {/* Feature list */}
          {(existingFeatures.length > 0 || toAdd.length > 0) && (
            <div className="flex flex-col gap-1.5 mb-3">
              {existingFeatures.map((feat) => {
                const color = KIND_COLORS[feat.kind ?? ""] ?? "#6B7280";
                return (
                  <div
                    key={feat.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--fg)" }}
                      >
                        {feat.name}
                      </span>
                      {feat.kind && (
                        <span
                          className="text-xs"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {feat.kind}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-xs shrink-0"
                      style={{
                        color: "var(--fg-subtle)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {feat.start_bp.toLocaleString()}–{feat.end_bp.toLocaleString()} bp
                    </span>
                    <button
                      onClick={() =>
                        setToDelete((prev) => new Set([...prev, feat.id]))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--danger)",
                        cursor: "pointer",
                        fontSize: 13,
                        padding: "0 4px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {toAdd.map((feat) => {
                const color = KIND_COLORS[feat.kind ?? ""] ?? "#6B7280";
                return (
                  <div
                    key={feat.tempId}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{
                      background:
                        "color-mix(in oklab,var(--primary) 5%,transparent)",
                      border:
                        "1px solid color-mix(in oklab,var(--primary) 20%,transparent)",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--fg)" }}
                      >
                        {feat.name}
                      </span>
                      {feat.kind && (
                        <span
                          className="text-xs"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {feat.kind}
                        </span>
                      )}
                      <span
                        className="text-xs rounded px-1 py-0.5"
                        style={{
                          background:
                            "color-mix(in oklab,var(--primary) 12%,transparent)",
                          color: "var(--primary)",
                        }}
                      >
                        nouveau
                      </span>
                    </div>
                    <span
                      className="text-xs shrink-0"
                      style={{
                        color: "var(--fg-subtle)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {feat.start_bp}–{feat.end_bp} bp
                    </span>
                    <button
                      onClick={() =>
                        setToAdd((prev) =>
                          prev.filter((x) => x.tempId !== feat.tempId)
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--danger)",
                        cursor: "pointer",
                        fontSize: 13,
                        padding: "0 4px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add feature row */}
          <div
            className="rounded-lg px-4 py-3 flex flex-col gap-2.5"
            style={{ border: "1px dashed var(--border)", background: "var(--surface-2)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--fg-subtle)" }}>
              Ajouter une feature
            </p>
            <div className="flex gap-2 flex-wrap">
              <input
                style={{ ...INPUT, flex: "2 1 120px", minWidth: 100 }}
                value={newFeat.name}
                onChange={(e) =>
                  setNewFeat((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Nom *"
                onKeyDown={(e) => e.key === "Enter" && addLocalFeature()}
              />
              <select
                value={newFeat.kind}
                onChange={(e) =>
                  setNewFeat((p) => ({ ...p, kind: e.target.value }))
                }
                style={{ ...INPUT, flex: "1 1 100px", minWidth: 90 }}
              >
                <option value="">Type</option>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <input
                type="number"
                style={{ ...INPUT, flex: "1 1 90px", minWidth: 80 }}
                value={newFeat.start_bp}
                onChange={(e) =>
                  setNewFeat((p) => ({ ...p, start_bp: e.target.value }))
                }
                placeholder="Début *"
                onKeyDown={(e) => e.key === "Enter" && addLocalFeature()}
              />
              <input
                type="number"
                style={{ ...INPUT, flex: "1 1 90px", minWidth: 80 }}
                value={newFeat.end_bp}
                onChange={(e) =>
                  setNewFeat((p) => ({ ...p, end_bp: e.target.value }))
                }
                placeholder="Fin *"
                onKeyDown={(e) => e.key === "Enter" && addLocalFeature()}
              />
              <select
                value={newFeat.strand}
                onChange={(e) =>
                  setNewFeat((p) => ({ ...p, strand: e.target.value }))
                }
                style={{ ...INPUT, flex: "1 1 80px", minWidth: 70 }}
              >
                <option value="">Brin</option>
                <option value="+">+ sens</option>
                <option value="-">− antisens</option>
              </select>
              <button
                onClick={addLocalFeature}
                disabled={!canAddFeat}
                className="rounded px-4 py-1.5 text-sm font-semibold shrink-0"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  cursor: canAddFeat ? "pointer" : "default",
                  opacity: canAddFeat ? 1 : 0.45,
                  whiteSpace: "nowrap",
                }}
              >
                + Ajouter
              </button>
            </div>
          </div>
        </section>

        {/* ── Notes ────────────────────────────────────────────────────── */}
        <section>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--fg-subtle)" }}
          >
            Notes
          </p>
          <textarea
            rows={3}
            value={form.notes_md}
            onChange={f("notes_md")}
            placeholder="Notes libres…"
            style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
          />
        </section>
      </div>
    </div>
  );
}
