import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEntry, getExperiment, listEntries, type EntryListItem } from "../../api/notebook";
import { listUsers } from "../../api/users";

interface ProtocolTemplate {
  id?: string;
  code?: string;
  title: string;
  body_html: string | null;
}

interface Props {
  experimentId: string | null;
  selectedEntryId: string | null;
  onSelect: (id: string) => void;
  template?: ProtocolTemplate | null;
  onCreatedFromTemplate?: (entryId: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", "");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function EntryList({ experimentId, selectedEntryId, onSelect, template, onCreatedFromTemplate }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const expQuery = useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => getExperiment(experimentId!),
    enabled: !!experimentId,
    staleTime: 30_000,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    staleTime: 5 * 60_000,
  });

  const entriesQuery = useQuery({
    queryKey: ["entries", experimentId],
    queryFn: () => listEntries(experimentId!),
    enabled: !!experimentId,
    staleTime: 15_000,
  });

  const exp = expQuery.data ?? null;
  const isExpLocked = !!exp?.locked_at;

  const userNameMap: Record<string, string> = {};
  usersQuery.data?.forEach((u) => { userNameMap[u.id] = u.full_name ?? u.username; });

  const createMutation = useMutation({
    mutationFn: () =>
      createEntry({
        experiment_id: experimentId!,
        code,
        title,
        entry_date: today(),
        ...(template ? { body_md: template.body_html, ...(template.id ? { protocol_id: template.id } : {}) } : {}),
      }),
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ["entries", experimentId] });
      setAdding(false);
      setCode("");
      setTitle("");
      setError(null);
      if (template && onCreatedFromTemplate) {
        onCreatedFromTemplate(entry.id);
      } else {
        onSelect(entry.id);
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--fg)",
    borderRadius: 4,
    fontSize: 11,
    padding: "4px 8px",
    outline: "none",
    width: "100%",
  };

  if (!experimentId) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center"
        style={{ width: 260, minWidth: 260, borderRight: "1px solid var(--border)", background: "var(--bg)" }}
      >
        <p className="text-xs text-center px-6" style={{ color: "var(--fg-subtle)" }}>
          Sélectionne une expérience dans l'arbre
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ width: 260, minWidth: 260, borderRight: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
          Entrées
        </span>
        {!isExpLocked && (
          <button
            onClick={() => {
              if (template) setTitle(template.title);
              setAdding(true);
            }}
            title={template ? (template.code ? `Créer depuis le template ${template.code}` : `Créer depuis ${template.title}`) : "Nouvelle entrée"}
            style={{
              background: template ? "color-mix(in oklab, #EAB308 12%, transparent)" : "transparent",
              border: template ? "1px solid color-mix(in oklab, #EAB308 40%, transparent)" : "none",
              borderRadius: 4,
              cursor: "pointer",
              color: template ? "#b45309" : "var(--fg-muted)",
              fontSize: template ? 11 : 18,
              lineHeight: 1,
              padding: template ? "2px 6px" : 0,
              fontWeight: template ? 600 : 400,
            }}
          >
            {template ? (template.code ? "+ Template" : "+ Outil") : "+"}
          </button>
        )}
      </div>

      {/* Validation banner */}
      {isExpLocked && exp && (
        <div
          className="px-3 py-2 flex items-center gap-2 shrink-0"
          style={{
            background: "color-mix(in oklab, var(--success, #22c55e) 10%, transparent)",
            borderBottom: "1px solid color-mix(in oklab, var(--success, #22c55e) 25%, transparent)",
          }}
        >
          <span style={{ fontSize: 12 }}>✅</span>
          <div className="flex flex-col">
            <span className="text-xs font-semibold" style={{ color: "var(--success, #22c55e)" }}>
              Expérience validée
            </span>
            <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
              {exp.locked_by_id ? `par ${userNameMap[exp.locked_by_id] ?? "admin"} · ` : ""}
              {new Date(exp.locked_at!).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      )}

      {/* New entry form */}
      {adding && (
        <div className="flex flex-col gap-1 px-3 py-2" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <input
            autoFocus
            placeholder="Code (ex: EXP-001-J1)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Titre de l'entrée"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code && title) createMutation.mutate();
              if (e.key === "Escape") { setAdding(false); setError(null); }
            }}
            style={inputStyle}
          />
          {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => { if (code && title) createMutation.mutate(); }}
              disabled={createMutation.isPending}
              style={{ fontSize: 10, padding: "2px 8px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
            >
              {createMutation.isPending ? "…" : "Créer"}
            </button>
            <button
              onClick={() => { setAdding(false); setError(null); }}
              style={{ fontSize: 10, padding: "2px 8px", background: "var(--surface-2)", color: "var(--fg-muted)", border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {entriesQuery.isLoading && (
          <p className="px-4 py-4 text-xs" style={{ color: "var(--fg-muted)" }}>Chargement…</p>
        )}
        {entriesQuery.data?.length === 0 && (
          <p className="px-4 py-4 text-xs" style={{ color: "var(--fg-subtle)" }}>
            Aucune entrée — clique + pour créer
          </p>
        )}
        {entriesQuery.data?.map((entry: EntryListItem) => {
          const isSelected = entry.id === selectedEntryId;
          return (
            <div
              key={entry.id}
              onClick={() => onSelect(entry.id)}
              className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
              style={{
                background: isSelected ? "var(--primary-soft)" : "transparent",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span
                className="shrink-0 text-xs mt-0.5"
                style={{ fontFamily: "var(--font-mono)", color: isSelected ? "var(--primary)" : "var(--fg-subtle)", minWidth: 40 }}
              >
                {formatDate(entry.entry_date)}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs truncate"
                  style={{ color: isSelected ? "var(--primary)" : "var(--fg)", fontWeight: isSelected ? 600 : 400 }}
                >
                  {entry.title}
                </p>
                {entry.is_locked && (
                  <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>🔒</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
