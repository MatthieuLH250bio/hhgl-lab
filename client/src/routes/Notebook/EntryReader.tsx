import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteEntry, deleteResult, getEntry, getEntryHistory, getExperiment, lockEntry, updateResult, type Entry, type EntryHistory } from "../../api/notebook";
import { listUsers } from "../../api/users";
import { toast } from "../../stores/toast";

interface Props {
  entryId: string;
  experimentId: string;
  onEdit: () => void;
  onDeleted: () => void;
}

const TONE_HEX: Record<string, string> = {
  success: "#22c55e",
  warning: "#f59e0b",
  danger:  "#ef4444",
  primary: "#6366f1",
  neutral: "#6b7280",
};

const TONE_COLORS: Record<string, { bg: string; fg: string }> = {
  success: { bg: "color-mix(in oklab, var(--success) 12%, transparent)", fg: "var(--success)" },
  warning: { bg: "color-mix(in oklab, var(--warning) 12%, transparent)", fg: "var(--warning)" },
  danger:  { bg: "color-mix(in oklab, var(--danger)  12%, transparent)", fg: "var(--danger)" },
  primary: { bg: "var(--primary-soft)", fg: "var(--primary)" },
  neutral: { bg: "var(--surface-2)", fg: "var(--fg-muted)" },
};

const TONES = ["neutral", "success", "warning", "danger", "primary"] as const;

function ResultCard({
  result, entryId, onUpdated, onDeleted,
}: {
  result: Entry["results"][number];
  entryId: string;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    label: result.label,
    value_num: result.value_num != null ? String(result.value_num) : "",
    value_text: result.value_text ?? "",
    unit: result.unit ?? "",
    tone: result.tone,
  });
  const [saving, setSaving] = useState(false);

  const tone = TONE_COLORS[result.tone] ?? TONE_COLORS.neutral;
  const display = result.value_num != null
    ? Number(result.value_num).toLocaleString("fr-FR", { maximumFractionDigits: 4 })
    : (result.value_text ?? "—");

  const handleSave = async () => {
    setSaving(true);
    try {
      const valueNum = form.value_num !== "" ? parseFloat(form.value_num) : null;
      await updateResult(entryId, result.id, {
        label: form.label,
        value_num: valueNum,
        value_text: valueNum == null && form.value_text ? form.value_text : null,
        unit: form.unit || null,
        tone: form.tone,
      });
      onUpdated();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteResult(entryId, result.id);
    onDeleted();
  };

  if (editing) {
    return (
      <div className="rounded-lg p-3 flex flex-col gap-2"
        style={{ border: "1.5px solid var(--primary)", background: "var(--surface)" }}>
        <input
          className="w-full text-xs px-2 py-1 rounded"
          style={{ border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)" }}
          placeholder="Label"
          value={form.label}
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
        />
        <div className="flex gap-1">
          <input
            className="flex-1 text-xs px-2 py-1 rounded"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)", fontFamily: "var(--font-mono)" }}
            placeholder="Valeur numérique"
            value={form.value_num}
            onChange={e => setForm(f => ({ ...f, value_num: e.target.value, value_text: "" }))}
          />
          <input
            className="w-14 text-xs px-2 py-1 rounded"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)" }}
            placeholder="Unité"
            value={form.unit}
            onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
          />
        </div>
        {form.value_num === "" && (
          <input
            className="w-full text-xs px-2 py-1 rounded"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)" }}
            placeholder="Valeur texte (ex: 8/12)"
            value={form.value_text}
            onChange={e => setForm(f => ({ ...f, value_text: e.target.value }))}
          />
        )}
        <select
          className="text-xs px-2 py-1 rounded"
          style={{ border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--fg)" }}
          value={form.tone}
          onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}
        >
          {TONES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex gap-1 mt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 text-xs px-2 py-1 rounded font-medium"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {saving ? "…" : "Enregistrer"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs px-2 py-1 rounded"
            style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            className="text-xs px-2 py-1 rounded"
            style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}
            title="Supprimer ce résultat"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1 cursor-pointer group relative"
      style={{ background: tone.bg, border: `1px solid color-mix(in oklab, ${tone.fg} 20%, transparent)` }}
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
    >
      <span className="text-xs uppercase tracking-wide font-semibold" style={{ color: "var(--fg-subtle)" }}>
        {result.label}
      </span>
      <span className="text-xl font-bold" style={{ fontFamily: "var(--font-mono)", color: tone.fg }}>
        {display}
      </span>
      {result.unit && (
        <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>{result.unit}</span>
      )}
      <span className="absolute top-1.5 right-1.5 text-xs opacity-0 group-hover:opacity-60 transition-opacity"
        style={{ color: "var(--fg-subtle)" }}>✎</span>
    </div>
  );
}

function AttachmentCard({ att }: { att: Entry["attachments"][number] }) {
  const isImage = att.mime_type?.startsWith("image/") ?? false;
  const src = isImage ? `/api/files/${att.thumbnail_path ?? att.storage_path}` : null;

  const KIND_STYLE: Record<string, string> = {
    gel:          "#1a1a2e",
    microscopy:   "#0d2b1e",
    chromatogram: "#1e1e40",
    plate:        "#1a2540",
    image:        "var(--surface-2)",
    file:         "var(--surface-2)",
  };

  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center justify-center"
        style={{ height: 120, background: KIND_STYLE[att.kind] ?? "var(--surface-2)" }}
      >
        {src ? (
          <img src={src} alt={att.caption ?? att.original_name} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ color: "var(--fg-subtle)", fontSize: 12 }}>📄 {att.kind}</span>
        )}
      </div>
      <div className="px-2 py-1.5">
        {att.caption && (
          <p className="text-xs" style={{ color: "var(--fg)" }}>{att.caption}</p>
        )}
        <p className="text-xs truncate" style={{ fontFamily: "var(--font-mono)", color: "var(--fg-subtle)" }}>
          {att.original_name}
        </p>
      </div>
    </div>
  );
}

const ACTION_STYLE: Record<string, { label: string; color: string }> = {
  created: { label: "Créée",      color: "#4f8a3a" },
  updated: { label: "Modifiée",   color: "#1e497a" },
  locked:  { label: "Verrouillée", color: "#b76e1f" },
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 60) return `il y a ${m || 1} min`;
  if (h < 24) return `il y a ${h}h`;
  if (d === 1) return "hier";
  return `il y a ${d}j`;
}

function ResultChart({ results }: { results: Entry["results"] }) {
  const [open, setOpen] = useState(false);
  const numeric = results.filter((r) => r.value_num != null && r.value_num !== "");
  if (numeric.length < 2) return null;

  const BAR_W = 52, GAP = 10, CHART_H = 140, PAD_L = 44, PAD_T = 16, LABEL_AREA = 44;
  const values = numeric.map((r) => parseFloat(r.value_num as string));
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const svgW = PAD_L + GAP + numeric.length * (BAR_W + GAP);
  const svgH = PAD_T + CHART_H + LABEL_AREA;
  const yOf = (v: number) => PAD_T + CHART_H - ((v - minVal) / range) * CHART_H;
  const zeroY = yOf(Math.max(minVal, 0));

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", padding: 0, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}
      >
        {open ? "▾" : "▸"} Graphique
      </button>
      {open && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, overflowX: "auto", marginTop: 12 }}>
          <svg width={svgW} height={svgH} style={{ fontFamily: "var(--font-mono)", display: "block" }}>
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CHART_H} stroke="var(--border)" strokeWidth={1} />
            <line x1={PAD_L} y1={zeroY} x2={svgW} y2={zeroY} stroke="var(--border)" strokeWidth={1} strokeDasharray="4,3" />
            <text x={PAD_L - 4} y={PAD_T + 4} fontSize={9} fill="var(--fg-subtle)" textAnchor="end">
              {maxVal.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
            </text>
            {minVal < 0 && (
              <text x={PAD_L - 4} y={PAD_T + CHART_H + 4} fontSize={9} fill="var(--fg-subtle)" textAnchor="end">
                {minVal.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
              </text>
            )}
            {numeric.map((r, i) => {
              const val = parseFloat(r.value_num as string);
              const color = TONE_HEX[r.tone] ?? TONE_HEX.neutral;
              const x = PAD_L + GAP + i * (BAR_W + GAP);
              const barTop = yOf(val);
              const barH = Math.max(Math.abs(zeroY - barTop), 2);
              const barY = Math.min(barTop, zeroY);
              return (
                <g key={r.id}>
                  <rect x={x} y={barY} width={BAR_W} height={barH} fill={color} opacity={0.82} rx={2} />
                  <text x={x + BAR_W / 2} y={barY - 4} fontSize={9} fill="var(--fg-muted)" textAnchor="middle">
                    {val.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
                  </text>
                  <text x={x + BAR_W / 2} y={PAD_T + CHART_H + 14} fontSize={9} fill="var(--fg-subtle)" textAnchor="middle">
                    {r.label.length > 9 ? r.label.slice(0, 8) + "…" : r.label}
                  </text>
                  {r.unit && (
                    <text x={x + BAR_W / 2} y={PAD_T + CHART_H + 27} fontSize={8} fill="var(--fg-subtle)" textAnchor="middle" opacity={0.7}>
                      {r.unit}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}

function HistoryPanel({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const query = useQuery<EntryHistory[]>({
    queryKey: ["entry-history", entryId],
    queryFn: () => getEntryHistory(entryId),
    enabled: open,
    staleTime: 30_000,
  });

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", padding: 0 }}
      >
        {open ? "▾" : "▸"} Historique des modifications
      </button>

      {open && (
        <div className="flex flex-col gap-2 mt-3">
          {query.isLoading && (
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>Chargement…</p>
          )}
          {query.data?.length === 0 && (
            <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>Aucune modification enregistrée.</p>
          )}
          {query.data?.map((h) => {
            const style = ACTION_STYLE[h.action] ?? { label: h.action, color: "var(--fg-muted)" };
            return (
              <div
                key={h.id}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <span
                  className="rounded px-1.5 py-0.5 text-xs font-semibold shrink-0 mt-0.5"
                  style={{ background: `color-mix(in oklab, ${style.color} 12%, transparent)`, color: style.color }}
                >
                  {style.label}
                </span>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                    {h.user_name ?? "Système"} · {relTime(h.created_at)}
                  </span>
                  {h.changed_fields && Object.keys(h.changed_fields).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(h.changed_fields).map(([field, oldVal]) => (
                        <span
                          key={field}
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{ background: "var(--surface-2)", color: "var(--fg-subtle)", fontFamily: "var(--font-mono)" }}
                          title={`Avant : ${oldVal}`}
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs shrink-0 mt-0.5" style={{ color: "var(--fg-subtle)" }}>
                  {new Date(h.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function EntryReader({ entryId, experimentId, onEdit, onDeleted }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const entryQuery = useQuery({
    queryKey: ["entry", entryId],
    queryFn: () => getEntry(entryId),
    staleTime: 15_000,
  });

  const expQuery = useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => getExperiment(experimentId),
    staleTime: 30_000,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    staleTime: 5 * 60_000,
  });

  const userNameMap: Record<string, string> = {};
  usersQuery.data?.forEach((u) => { userNameMap[u.id] = u.full_name ?? u.username; });

  const exp = expQuery.data ?? null;

  const lockMutation = useMutation({
    mutationFn: () => lockEntry(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entry", entryId] });
      qc.invalidateQueries({ queryKey: ["entries", experimentId] });
      toast.success("Entrée verrouillée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEntry(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries", experimentId] });
      toast.success("Entrée supprimée");
      onDeleted();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (entryQuery.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--fg-muted)", fontSize: 13 }}>
        Chargement…
      </div>
    );
  }

  const entry = entryQuery.data;
  if (!entry) return null;

  const formattedDate = new Date(entry.entry_date).toLocaleDateString("fr-FR", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4 px-8 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>
            {entry.code} · {formattedDate}
          </span>
          <h1 className="text-lg font-bold truncate" style={{ color: "var(--fg)" }}>
            {entry.title}
          </h1>
          <div className="flex flex-wrap gap-1 mt-1">
            {entry.tags && entry.tags.map((tag) => (
              <span
                key={tag}
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
              >
                {tag}
              </span>
            ))}
            {entry.protocol_id && (
              <button
                onClick={() => navigate(`/protocols?id=${entry.protocol_id}`)}
                className="rounded px-2 py-0.5 text-xs font-semibold flex items-center gap-1"
                style={{
                  background: "color-mix(in oklab, #EAB308 12%, transparent)",
                  border: "1px solid color-mix(in oklab, #EAB308 30%, transparent)",
                  color: "#b45309",
                  cursor: "pointer",
                }}
                title="Ouvrir le protocole lié"
              >
                <span>⬡</span>
                {entry.protocol_code} — {entry.protocol_title}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" data-no-print>
          <button
            onClick={() => window.print()}
            className="rounded px-3 py-1 text-xs font-medium"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
          >
            ⎙ PDF
          </button>
          {entry.is_locked ? (
            <span className="rounded px-2 py-1 text-xs" style={{ background: "var(--surface-2)", color: "var(--fg-muted)" }}>
              🔒 Verrouillée
            </span>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="rounded px-3 py-1 text-xs font-medium"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer" }}
              >
                Éditer
              </button>
              <button
                onClick={() => { if (confirm("Verrouiller cette entrée ? Elle ne sera plus modifiable.")) lockMutation.mutate(); }}
                className="rounded px-3 py-1 text-xs font-medium"
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
              >
                🔒 Verrouiller
              </button>
              <button
                onClick={() => { if (confirm("Supprimer cette entrée ?")) deleteMutation.mutate(); }}
                className="rounded px-3 py-1 text-xs font-medium"
                style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", cursor: "pointer" }}
              >
                Supprimer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Validation banner */}
      {exp?.locked_at && (
        <div
          className="px-8 py-2 flex items-center gap-2 shrink-0"
          style={{
            background: "color-mix(in oklab, #22c55e 10%, transparent)",
            borderBottom: "1px solid color-mix(in oklab, #22c55e 25%, transparent)",
          }}
        >
          <span style={{ fontSize: 12 }}>✅</span>
          <span className="text-xs font-semibold" style={{ color: "#16a34a" }}>Expérience validée</span>
          <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
            {exp.locked_by_id ? `par ${userNameMap[exp.locked_by_id] ?? "admin"} · ` : ""}
            {new Date(exp.locked_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-8" style={{ background: "var(--bg)" }}>
        {/* Body */}
        {entry.body_md ? (
          <div
            className="prose prose-sm max-w-none"
            style={{ color: "var(--fg)" }}
            dangerouslySetInnerHTML={{ __html: entry.body_md }}
            onClick={(e) => {
              const chip = (e.target as HTMLElement).closest("[data-db-ref]") as HTMLElement | null;
              if (chip) {
                const refType = chip.getAttribute("data-ref-type");
                const refId = chip.getAttribute("data-ref-id");
                if (refType && refId) navigate(`/database?type=${refType}&id=${refId}`);
              }
            }}
          />
        ) : (
          <p className="text-sm italic" style={{ color: "var(--fg-subtle)" }}>Aucune note rédigée.</p>
        )}

        {/* Results */}
        {entry.results.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--fg-subtle)" }}>
              Résultats
            </h3>
            <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {entry.results.map((r) => (
                <ResultCard
                  key={r.id}
                  result={r}
                  entryId={entryId}
                  onUpdated={() => qc.invalidateQueries({ queryKey: ["entry", entryId] })}
                  onDeleted={() => qc.invalidateQueries({ queryKey: ["entry", entryId] })}
                />
              ))}
            </div>
          </section>
        )}

        <ResultChart results={entry.results} />

        {/* Attachments */}
        {entry.attachments.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--fg-subtle)" }}>
              Pièces jointes
            </h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
              {entry.attachments.map((a) => (
                <AttachmentCard key={a.id} att={a} />
              ))}
            </div>
          </section>
        )}

        <HistoryPanel entryId={entryId} />
      </div>
    </div>
  );
}
