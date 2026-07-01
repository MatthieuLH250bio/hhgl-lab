import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  createProtocol,
  deleteProtocol,
  getProtocol,
  restoreVersion,
  updateProtocol,
  type Protocol,
} from "../../api/protocols";
import ProtocolEditor from "./ProtocolEditor";
import { toast } from "../../stores/toast";

type Mode = "view" | "edit" | "create";

interface FormState {
  title: string;
  category: string;
  duration: string;
  author_name: string;
  tagsText: string;
  body_html: string;
}

const EMPTY_FORM: FormState = { title: "", category: "", duration: "", author_name: "", tagsText: "", body_html: "" };

function protocolToForm(p: Protocol): FormState {
  return {
    title: p.title,
    category: p.category ?? "",
    duration: p.duration ?? "",
    author_name: p.author_name ?? "",
    tagsText: p.tags.join(", "),
    body_html: p.body_html ?? "",
  };
}

const NOTE_VIEW_CSS = `
.protocol-body h1 { font-size: 1.35em; font-weight: 700; margin: 1.2em 0 0.4em; color: var(--fg); }
.protocol-body h2 { font-size: 1em; font-weight: 700; margin: 1.2em 0 0.3em; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.protocol-body h3 { font-size: 1em; font-weight: 600; margin: 0.8em 0 0.2em; }
.protocol-body ul, .protocol-body ol { padding-left: 1.4em; margin: 0.3em 0; }
.protocol-body li { margin: 0.25em 0; line-height: 1.6; }
.protocol-body p { margin: 0.4em 0; line-height: 1.7; }
.protocol-body code { background: var(--surface-2); border-radius: 3px; padding: 1px 5px; font-family: var(--font-mono); font-size: 0.88em; }
.protocol-body strong { font-weight: 700; }
.protocol-body em { font-style: italic; }
.protocol-body table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
.protocol-body td, .protocol-body th { border: 1px solid var(--border); padding: 6px 10px; font-size: 0.9em; }
.protocol-body th { background: var(--surface-2); font-weight: 600; }
.protocol-body .protocol-note {
  background: color-mix(in oklab, #D97706 8%, transparent);
  border-left: 3px solid #D97706;
  border-radius: 0 6px 6px 0;
  padding: 10px 14px;
  margin: 0.6em 0;
}
.protocol-body .protocol-note::before {
  content: "⚠ Note";
  display: block;
  font-weight: 700;
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #D97706;
  margin-bottom: 4px;
}
`;

// ── Checklist mode helpers ────────────────────────────────────────────────────

function extractSteps(html: string): Array<{ innerHtml: string; section: string }> {
  if (!html) return [];
  const div = document.createElement('div');
  div.innerHTML = html;
  const steps: Array<{ innerHtml: string; section: string }> = [];
  let section = '';
  for (const child of Array.from(div.children)) {
    if (/^H[1-3]$/.test(child.tagName)) {
      section = child.textContent?.trim() ?? '';
    } else if (child.tagName === 'OL' || child.tagName === 'UL') {
      for (const li of Array.from(child.querySelectorAll('li'))) {
        steps.push({ innerHtml: li.innerHTML, section });
      }
    }
  }
  return steps;
}

function ChecklistMode({ protocol, onStop }: { protocol: Protocol; onStop: () => void }) {
  const steps = useMemo(() => extractSteps(protocol.body_html ?? ''), [protocol.body_html]);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const done = checked.size;
  const total = steps.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const toggle = (i: number) => setChecked(prev => {
    const s = new Set(prev);
    s.has(i) ? s.delete(i) : s.add(i);
    return s;
  });

  // Group by section heading
  const grouped: Array<{ section: string; items: Array<{ innerHtml: string; index: number }> }> = [];
  steps.forEach((step, i) => {
    const last = grouped[grouped.length - 1];
    if (!last || last.section !== step.section) {
      grouped.push({ section: step.section, items: [{ innerHtml: step.innerHtml, index: i }] });
    } else {
      last.items.push({ innerHtml: step.innerHtml, index: i });
    }
  });

  return (
    <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Sticky progress bar */}
      <div className="px-8 py-3 shrink-0 sticky top-0 z-10"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
              {done} / {total} étapes
            </span>
            {done === total && total > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "color-mix(in oklab,var(--success) 14%,transparent)", color: "var(--success)" }}>
                ✓ Terminé !
              </span>
            )}
          </div>
          <button onClick={onStop}
            className="rounded px-3 py-1 text-xs font-medium"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}>
            ✕ Arrêter
          </button>
        </div>
        <div style={{ height: 5, background: "var(--surface-2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: pct === 100 ? "var(--success)" : "var(--primary)",
            borderRadius: 99, transition: "width 0.25s ease",
          }} />
        </div>
      </div>

      {/* Steps */}
      <div className="px-8 py-6 flex flex-col gap-6" style={{ maxWidth: 740 }}>
        {steps.length === 0 ? (
          <div className="rounded-lg px-5 py-8 text-center"
            style={{ border: "1.5px dashed var(--border)", background: "var(--surface)" }}>
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
              Aucune étape détectée.
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--fg-subtle)" }}>
              Structurez le protocole avec des listes ordonnées pour activer le mode checklist.
            </p>
          </div>
        ) : grouped.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-2">
            {group.section && (
              <h2 className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: "var(--fg-subtle)" }}>{group.section}</h2>
            )}
            {group.items.map(({ innerHtml, index }) => {
              const isChecked = checked.has(index);
              return (
                <label key={index}
                  className="flex items-start gap-3 rounded-lg px-4 py-3 cursor-pointer transition-all"
                  style={{
                    background: isChecked
                      ? "color-mix(in oklab,var(--success) 8%,transparent)"
                      : "var(--surface)",
                    border: `1px solid ${isChecked
                      ? "color-mix(in oklab,var(--success) 28%,transparent)"
                      : "var(--border)"}`,
                  }}
                >
                  <input type="checkbox" checked={isChecked} onChange={() => toggle(index)}
                    className="mt-0.5 shrink-0"
                    style={{ width: 15, height: 15, accentColor: "var(--success)", cursor: "pointer" }} />
                  <span className="text-xs font-semibold shrink-0 mt-0.5"
                    style={{ color: isChecked ? "var(--success)" : "var(--fg-subtle)", fontFamily: "var(--font-mono)", minWidth: 22 }}>
                    {index + 1}.
                  </span>
                  <span className="text-sm flex-1 leading-relaxed protocol-body"
                    style={{ color: isChecked ? "var(--fg-subtle)" : "var(--fg)", textDecoration: isChecked ? "line-through" : "none", opacity: isChecked ? 0.55 : 1, transition: "opacity 0.2s" }}
                    dangerouslySetInnerHTML={{ __html: innerHtml }} />
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  protocolId: string | null;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onClose: () => void;
}

export default function ProtocolDetail({ protocolId, mode, onModeChange, onSaved, onDeleted, onClose }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["protocol", protocolId],
    queryFn: () => getProtocol(protocolId!),
    enabled: !!protocolId,
    staleTime: 15_000,
  });
  const protocol = query.data ?? null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const populatedKey = useRef("");
  useEffect(() => {
    const key = `${mode}:${protocol?.id ?? "new"}`;
    if (populatedKey.current === key) return;
    populatedKey.current = key;
    if (mode === "edit" && protocol) setForm(protocolToForm(protocol));
    else if (mode === "create") setForm(EMPTY_FORM);
    setSaveError(null);
  }, [mode, protocol?.id]);

  const deleteMut = useMutation({
    mutationFn: () => deleteProtocol(protocolId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["protocols"] });
      toast.success("Protocole supprimé");
      onDeleted();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreMut = useMutation({
    mutationFn: (v: number) => restoreVersion(protocolId!, v),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["protocols"] });
      qc.invalidateQueries({ queryKey: ["protocol", protocolId] });
      toast.success(`Version v${v} restaurée`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const favMut = useMutation({
    mutationFn: () => updateProtocol(protocolId!, { is_favorite: !protocol?.is_favorite }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["protocols"] }); qc.invalidateQueries({ queryKey: ["protocol", protocolId] }); },
  });

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const body = {
        title: form.title.trim() || "Sans titre",
        category: form.category.trim() || null,
        duration: form.duration.trim() || null,
        author_name: form.author_name.trim() || null,
        tags: form.tagsText.split(",").map((s) => s.trim()).filter(Boolean),
        body_html: form.body_html || null,
      };
      const saved = mode === "create"
        ? await createProtocol(body)
        : await updateProtocol(protocolId!, body);
      qc.invalidateQueries({ queryKey: ["protocols"] });
      qc.invalidateQueries({ queryKey: ["protocol", saved.id] });
      toast.success(mode === "create" ? "Protocole créé" : "Protocole enregistré");
      onSaved(saved.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  function field(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 5,
    padding: "6px 10px", fontSize: 13, color: "var(--fg)", outline: "none", width: "100%",
  };

  // ── Edit / Create ────────────────────────────────────────────────────────────
  if (mode === "create" || mode === "edit") {
    return (
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <div className="px-8 py-3 shrink-0 flex items-center justify-between gap-4"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <h1 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
            {mode === "create" ? "Nouveau protocole" : "Modifier le protocole"}
          </h1>
          <div className="flex gap-2">
            <button onClick={() => mode === "create" ? onClose() : onModeChange("view")}
              className="rounded px-4 py-1.5 text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className="rounded px-4 py-1.5 text-sm font-medium"
              style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? "Sauvegarde…" : mode === "create" ? "Créer" : "Sauvegarder"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-4" style={{ background: "var(--bg)" }}>
          {/* Metadata row */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Titre *</label>
              <input style={inputStyle} value={form.title} onChange={field("title")} placeholder="Nom du protocole" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Catégorie</label>
              <input style={inputStyle} value={form.category} onChange={field("category")} placeholder="DNA/RNA, Cloning…" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Durée</label>
              <input style={inputStyle} value={form.duration} onChange={field("duration")} placeholder="~2h, ~30 min" />
            </div>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Auteur</label>
              <input style={inputStyle} value={form.author_name} onChange={field("author_name")} placeholder="Initiales ou nom" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Tags</label>
              <input style={inputStyle} value={form.tagsText} onChange={field("tagsText")} placeholder="pcr, gel, extraction…" />
            </div>
          </div>

          {saveError && (
            <p className="text-xs rounded px-3 py-2"
              style={{ background: "color-mix(in oklab,var(--danger) 10%,transparent)", color: "var(--danger)" }}>
              {saveError}
            </p>
          )}

          <ProtocolEditor content={form.body_html} onChange={(html) => setForm((f) => ({ ...f, body_html: html }))} />
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!protocol) {
    if (query.isLoading) {
      return <div className="flex-1 flex items-center justify-center" style={{ color: "var(--fg-muted)", fontSize: 13 }}>Chargement…</div>;
    }
    return null;
  }

  // ── View ─────────────────────────────────────────────────────────────────────
  const updatedAt = new Date(protocol.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const sortedVersions = [...protocol.versions].sort((a, b) => b.version - a.version);

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      <style>{NOTE_VIEW_CSS}</style>


      {/* Header */}
      <div className="px-8 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "var(--fg-subtle)" }}>{protocol.code}</span>
              {protocol.category && (
                <span className="rounded px-2 py-0.5 text-xs"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}>
                  {protocol.category}
                </span>
              )}
              <span className="text-xs font-semibold" style={{ color: "var(--fg-subtle)" }}>v{protocol.version}</span>
            </div>
            <h1 className="text-xl font-bold leading-snug" style={{ color: "var(--fg)" }}>{protocol.title}</h1>
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
              {[protocol.duration && `⏱ ${protocol.duration}`, protocol.author_name && `par ${protocol.author_name}`, `mis à jour ${updatedAt}`].filter(Boolean).join(" · ")}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0" data-no-print>
            <button onClick={() => window.print()}
              className="rounded px-3 py-1 text-xs font-medium"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}>
              ⎙ PDF
            </button>
            <button
              onClick={() => navigate("/notebook", {
                state: {
                  fromProtocol: {
                    id: protocol.id,
                    code: protocol.code,
                    title: protocol.title,
                    body_html: protocol.body_html,
                  },
                },
              })}
              className="rounded px-3 py-1 text-xs font-semibold"
              style={{ background: "color-mix(in oklab, #EAB308 12%, transparent)", border: "1px solid color-mix(in oklab, #EAB308 35%, transparent)", color: "#b45309", cursor: "pointer" }}
              title="Créer une entrée de cahier depuis ce protocole"
            >
              → Cahier
            </button>
            <button onClick={() => favMut.mutate()}
              className="rounded px-3 py-1.5 text-xs font-medium"
              style={{ background: protocol.is_favorite ? "color-mix(in oklab,#D97706 12%,transparent)" : "var(--surface-2)", border: `1px solid ${protocol.is_favorite ? "#D97706" : "var(--border)"}`, color: protocol.is_favorite ? "#D97706" : "var(--fg-muted)", cursor: "pointer" }}>
              {protocol.is_favorite ? "⭐ Favori" : "☆ Favori"}
            </button>
            <button onClick={() => setRunning(true)} disabled={running}
              className="rounded px-4 py-1.5 text-xs font-semibold"
              style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: running ? "default" : "pointer", opacity: running ? 0.6 : 1 }}>
              ▶ Démarrer
            </button>
            <button onClick={() => onModeChange("edit")}
              className="rounded px-3 py-1 text-xs font-medium"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer" }}>
              Éditer
            </button>
            <button onClick={() => { if (confirm("Supprimer ce protocole ?")) deleteMut.mutate(); }}
              className="rounded px-3 py-1 text-xs font-medium"
              style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", cursor: "pointer" }}>
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Checklist mode */}
      {running && <ChecklistMode protocol={protocol} onStop={() => setRunning(false)} />}

      {/* Content (normal view) */}
      {!running && <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-8" style={{ background: "var(--bg)" }}>
        {protocol.body_html ? (
          <div className="protocol-body text-sm" style={{ color: "var(--fg)", maxWidth: 760 }}
            dangerouslySetInnerHTML={{ __html: protocol.body_html }} />
        ) : (
          <p className="text-sm italic" style={{ color: "var(--fg-subtle)" }}>Aucun contenu rédigé.</p>
        )}

        {/* Tags */}
        {protocol.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {protocol.tags.map((t) => (
              <span key={t} className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{t}</span>
            ))}
          </div>
        )}

        {/* Version history */}
        {sortedVersions.length > 1 && (
          <section>
            <button
              onClick={() => setVersionsOpen((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", padding: 0 }}
            >
              {versionsOpen ? "▾" : "▸"} Historique ({sortedVersions.length} versions)
            </button>
            {versionsOpen && (
              <div className="flex flex-col gap-1">
                {sortedVersions.map((v) => {
                  const isCurrent = v.version === protocol.version;
                  const d = new Date(v.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                  return (
                    <div key={v.id} className="flex items-center gap-3 rounded-lg px-3 py-2"
                      style={{ background: isCurrent ? "var(--primary-soft)" : "var(--surface)", border: "1px solid var(--border)" }}>
                      <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-mono)", color: isCurrent ? "var(--primary)" : "var(--fg-muted)", minWidth: 24 }}>
                        v{v.version}
                      </span>
                      <span className="text-xs flex-1" style={{ color: "var(--fg-muted)" }}>
                        {isCurrent ? "Version actuelle" : d}
                      </span>
                      {!isCurrent && (
                        <button onClick={() => { if (confirm(`Restaurer la v${v.version} ?`)) restoreMut.mutate(v.version); }}
                          className="text-xs rounded px-2 py-0.5"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}>
                          Restaurer
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>}
    </div>
  );
}
