import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FieldDef, ResourceKey } from "./config";
import { createResource, updateResource, deleteResource } from "../../api/database";
import PassagesPanel from "./PassagesPanel";

interface Props {
  resourceKey: ResourceKey;
  apiPath: string;
  item: Record<string, unknown> | null;
  fields: FieldDef[];
  isCreating: boolean;
  onClose: () => void;
}

function FieldInput({ field, value, onChange, isCreating }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; isCreating?: boolean }) {
  const base = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--fg)",
    borderRadius: 6,
    fontSize: 13,
    width: "100%",
    padding: "6px 10px",
    outline: "none",
    fontFamily: field.key === "sequence" ? "var(--font-mono)" : "inherit",
  };

  if (field.readOnly && !isCreating) {
    return (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)" }}>
        {String(value ?? "")}
      </span>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{ ...base, resize: "vertical" }}
      />
    );
  }

  if (field.type === "sequence") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value || null)}
        rows={6}
        placeholder="ATGCGTACG…"
        style={{ ...base, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.05em" }}
        spellCheck={false}
      />
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : parseInt(e.target.value))}
        style={base}
      />
    );
  }

  if (field.type === "float") {
    return (
      <input
        type="number"
        step="any"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
        style={base}
      />
    );
  }

  if (field.type === "array") {
    return (
      <input
        type="text"
        value={Array.isArray(value) ? (value as string[]).join(", ") : String(value ?? "")}
        onChange={(e) =>
          onChange(e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : null)
        }
        placeholder="valeur1, valeur2, …"
        style={base}
      />
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ ...base, cursor: "pointer" }}
      >
        <option value="">— Choisir —</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value || null)}
      style={base}
    />
  );
}

export default function DetailPanel({ resourceKey, apiPath, item, fields, isCreating, onClose }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(isCreating);
  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setEditing(isCreating);
    setForm(isCreating ? {} : { ...(item ?? {}) });
  }, [item, isCreating]);

  const saveMutation = useMutation({
    mutationFn: () =>
      isCreating
        ? createResource(apiPath, form)
        : updateResource(apiPath, item!.id as string, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["db", resourceKey] });
      qc.invalidateQueries({ queryKey: ["db-counts"] });
      if (isCreating) onClose();
      else setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteResource(apiPath, item!.id as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["db", resourceKey] });
      qc.invalidateQueries({ queryKey: ["db-counts"] });
      onClose();
    },
  });

  const title = isCreating ? "Nouveau" : (item?.code as string ?? "Détail");

  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{ width: 380, minWidth: 380, background: "var(--surface)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="font-semibold text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--fg)" }}>
          {title}
        </span>
        <div className="flex gap-2">
          {!isCreating && !editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="rounded px-3 py-1 text-xs font-medium"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer" }}
              >
                Éditer
              </button>
              <button
                onClick={() => { if (confirm("Supprimer ?")) deleteMutation.mutate(); }}
                className="rounded px-3 py-1 text-xs font-medium"
                style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", cursor: "pointer" }}
              >
                Supprimer
              </button>
            </>
          )}
          {editing && (
            <>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="rounded px-3 py-1 text-xs font-medium text-white"
                style={{ background: "var(--primary)", border: "none", cursor: "pointer" }}
              >
                {saveMutation.isPending ? "…" : "Sauvegarder"}
              </button>
              <button
                onClick={() => { setEditing(false); setForm({ ...(item ?? {}) }); if (isCreating) onClose(); }}
                className="rounded px-3 py-1 text-xs font-medium"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer" }}
              >
                Annuler
              </button>
            </>
          )}
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)", fontSize: 16 }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Error */}
      {saveMutation.isError && (
        <div className="px-4 py-2 text-xs" style={{ background: "color-mix(in oklab, var(--danger) 10%, transparent)", color: "var(--danger)" }}>
          {(saveMutation.error as Error).message}
        </div>
      )}

      {/* Fields + Passages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {fields.map((field) => {
          if (field.showWhen) {
            const ctxVal = editing ? form[field.showWhen.field] : item?.[field.showWhen.field];
            if (ctxVal !== field.showWhen.value) return null;
          }
          return (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
                {field.label}
              </label>
              {editing ? (
                <FieldInput
                  field={field}
                  value={form[field.key] ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                  isCreating={isCreating}
                />
              ) : (
                <span
                  className="text-sm"
                  style={{
                    color: item?.[field.key] == null ? "var(--fg-subtle)" : "var(--fg)",
                    ...(field.type === "sequence" && item?.[field.key] != null
                      ? { fontFamily: "var(--font-mono)", fontSize: 12, wordBreak: "break-all", lineHeight: 1.6 }
                      : {}),
                  }}
                >
                  {item?.[field.key] == null
                    ? "—"
                    : Array.isArray(item[field.key])
                    ? (item[field.key] as string[]).join(", ")
                    : String(item[field.key])}
                </span>
              )}
            </div>
          );
        })}
        {/* Passages section — cell-lines only, view mode */}
        {resourceKey === "cell-lines" && !isCreating && !!item?.id && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 4 }}>
            <PassagesPanel
              cellLineId={item.id as string}
              currentPassage={(item.passage_number as number | null | undefined) ?? null}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
