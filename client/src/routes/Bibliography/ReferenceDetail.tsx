import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRefToCollection,
  createReference,
  deleteReference,
  doiLookup,
  getReference,
  listCollections,
  removeRefFromCollection,
  updateReference,
  uploadPdf,
  type Collection,
  type Reference,
} from "../../api/bibliography";
import { listUsers } from "../../api/users";
import { useAuthStore } from "../../stores/auth";

type Mode = "view" | "edit" | "create";

interface FormState {
  title: string;
  authorsText: string;
  journal: string;
  year: string;
  doi: string;
  abstract: string;
  tagsText: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  authorsText: "",
  journal: "",
  year: "",
  doi: "",
  abstract: "",
  tagsText: "",
  notes: "",
};

function refToForm(ref: Reference): FormState {
  return {
    title: ref.title,
    authorsText: ref.authors.join("\n"),
    journal: ref.journal ?? "",
    year: ref.year != null ? String(ref.year) : "",
    doi: ref.doi ?? "",
    abstract: ref.abstract ?? "",
    tagsText: ref.tags.join(", "),
    notes: ref.notes ?? "",
  };
}

function formToBody(form: FormState) {
  return {
    title: form.title.trim() || "Sans titre",
    authors: form.authorsText.split("\n").map((s) => s.trim()).filter(Boolean),
    journal: form.journal.trim() || null,
    year: form.year.trim() ? parseInt(form.year.trim(), 10) : null,
    doi: form.doi.trim() || null,
    abstract: form.abstract.trim() || null,
    tags: form.tagsText.split(",").map((s) => s.trim()).filter(Boolean),
    notes: form.notes.trim() || null,
  };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 5,
        padding: "6px 10px",
        fontSize: 13,
        color: "var(--fg)",
        outline: "none",
        width: "100%",
      }}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 5,
        padding: "6px 10px",
        fontSize: 13,
        color: "var(--fg)",
        outline: "none",
        width: "100%",
        resize: "vertical",
        fontFamily: "inherit",
      }}
    />
  );
}

// ── View display ─────────────────────────────────────────────────────────────

function AbstractBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 450;
  const shown = isLong && !expanded ? text.slice(0, 450) + "…" : text;
  return (
    <div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
        {shown}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs mt-1"
          style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {expanded ? "Réduire" : "Voir tout"}
        </button>
      )}
    </div>
  );
}

// ── Collection section (view mode) ───────────────────────────────────────────

function CollectionSection({ refId, currentCollections }: { refId: string; currentCollections: Collection[] }) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: allCollections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: listCollections,
    staleTime: 30_000,
    enabled: pickerOpen,
  });

  const assignedIds = new Set(currentCollections.map((c) => c.id));

  async function toggle(col: Collection) {
    if (assignedIds.has(col.id)) {
      await removeRefFromCollection(col.id, refId);
    } else {
      await addRefToCollection(col.id, refId);
    }
    qc.invalidateQueries({ queryKey: ["reference", refId] });
    qc.invalidateQueries({ queryKey: ["references"] });
  }

  // Build depth map for indentation in picker
  function depth(col: Collection): number {
    if (!col.parent_id) return 0;
    const parent = allCollections.find((c) => c.id === col.parent_id);
    return parent ? 1 + depth(parent) : 0;
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
        Dossiers
      </h3>
      <div className="flex flex-wrap items-center gap-1.5 relative">
        {currentCollections.map((col) => (
          <span
            key={col.id}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}
          >
            📁 {col.name}
            <button
              onClick={() => toggle(col)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", padding: 0, fontSize: 10, lineHeight: 1 }}
            >
              ✕
            </button>
          </span>
        ))}

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="rounded px-2 py-0.5 text-xs"
            style={{ background: "var(--surface-2)", border: "1px dashed var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
          >
            + Ajouter
          </button>

          {pickerOpen && (
            <>
              {/* Backdrop */}
              <div
                style={{ position: "fixed", inset: 0, zIndex: 50 }}
                onClick={() => setPickerOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  zIndex: 51,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  minWidth: 200,
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {allCollections.length === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: "var(--fg-subtle)" }}>
                    Aucun dossier créé
                  </p>
                )}
                {allCollections
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((col) => {
                    const d = depth(col);
                    const checked = assignedIds.has(col.id);
                    return (
                      <button
                        key={col.id}
                        onClick={() => toggle(col)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          width: "100%",
                          paddingLeft: 8 + d * 14,
                          paddingRight: 12,
                          paddingTop: 6,
                          paddingBottom: 6,
                          background: checked ? "var(--primary-soft)" : "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 11, color: checked ? "var(--primary)" : "var(--fg-subtle)", flexShrink: 0 }}>
                          {checked ? "✓" : " "}
                        </span>
                        <span style={{ fontSize: 11 }}>📁</span>
                        <span style={{ fontSize: 12, color: checked ? "var(--primary)" : "var(--fg)" }}>
                          {col.name}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        {currentCollections.length === 0 && !pickerOpen && (
          <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
            Aucun dossier
          </span>
        )}
      </div>
    </section>
  );
}

// ── Edit / Create form ───────────────────────────────────────────────────────

function ReferenceForm({
  form,
  setForm,
  onSave,
  onCancel,
  isCreating,
  isSaving,
  saveError,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => void;
  onCancel: () => void;
  isCreating: boolean;
  isSaving: boolean;
  saveError: string | null;
}) {
  const [doiInput, setDoiInput] = useState(form.doi);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function handleDoiLookup() {
    if (!doiInput.trim()) return;
    setIsLookingUp(true);
    setLookupError(null);
    try {
      const result = await doiLookup(doiInput.trim());
      setForm((f) => ({
        ...f,
        title: result.title,
        authorsText: result.authors.join("\n"),
        journal: result.journal ?? f.journal,
        year: result.year != null ? String(result.year) : f.year,
        doi: result.doi,
        abstract: result.abstract ?? f.abstract,
      }));
      setDoiInput(result.doi);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsLookingUp(false);
    }
  }

  function set(field: keyof FormState) {
    return (v: string) => setForm((f) => ({ ...f, [field]: v }));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* DOI import section */}
      <div
        className="rounded-lg p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
          Importer via DOI
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value={doiInput}
            onChange={(e) => setDoiInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleDoiLookup(); } }}
            placeholder="10.1038/s41586-021-03819-2"
            style={{
              flex: 1,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              padding: "6px 10px",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--fg)",
              outline: "none",
            }}
          />
          <button
            onClick={handleDoiLookup}
            disabled={isLookingUp || !doiInput.trim()}
            className="rounded px-3 py-1.5 text-xs font-medium shrink-0"
            style={{
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              cursor: isLookingUp || !doiInput.trim() ? "default" : "pointer",
              opacity: !doiInput.trim() ? 0.5 : 1,
            }}
          >
            {isLookingUp ? "Recherche…" : "Remplir auto"}
          </button>
        </div>
        {lookupError && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>{lookupError}</p>
        )}
        <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
          Colle un DOI pour remplir automatiquement les champs ci-dessous.
        </p>
      </div>

      <Field label="Titre *">
        <Input value={form.title} onChange={set("title")} placeholder="Titre de l'article" />
      </Field>

      <Field label="Auteurs (un par ligne)">
        <Textarea
          value={form.authorsText}
          onChange={set("authorsText")}
          placeholder={"Smith J\nJones B\nWilliams C"}
          rows={3}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Journal">
          <Input value={form.journal} onChange={set("journal")} placeholder="Nature" />
        </Field>
        <Field label="Année">
          <Input value={form.year} onChange={set("year")} placeholder="2024" type="number" />
        </Field>
      </div>

      <Field label="DOI">
        <Input value={form.doi} onChange={set("doi")} placeholder="10.xxxx/xxxxx" />
      </Field>

      <Field label="Abstract">
        <Textarea
          value={form.abstract}
          onChange={set("abstract")}
          placeholder="Résumé de l'article…"
          rows={5}
        />
      </Field>

      <Field label="Tags (séparés par virgule)">
        <Input value={form.tagsText} onChange={set("tagsText")} placeholder="western, immunofluorescence" />
      </Field>

      <Field label="Notes personnelles">
        <Textarea
          value={form.notes}
          onChange={set("notes")}
          placeholder="Tes notes sur cet article…"
          rows={4}
        />
      </Field>

      {saveError && (
        <p className="text-xs rounded px-3 py-2" style={{ background: "color-mix(in oklab,var(--danger) 10%,transparent)", color: "var(--danger)" }}>
          {saveError}
        </p>
      )}

      <div className="flex gap-2 justify-end pb-2">
        <button
          onClick={onCancel}
          className="rounded px-4 py-1.5 text-sm"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer" }}
        >
          Annuler
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="rounded px-4 py-1.5 text-sm font-medium"
          style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.7 : 1 }}
        >
          {isSaving ? "Sauvegarde…" : isCreating ? "Créer" : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  refId: string | null;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onClose: () => void;
  defaultCollectionId?: string | null;
}

export default function ReferenceDetail({ refId, mode, onModeChange, onSaved, onDeleted, onClose, defaultCollectionId }: Props) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    staleTime: 5 * 60_000,
  });

  const userNameMap: Record<string, string> = {};
  usersQuery.data?.forEach((u) => { userNameMap[u.id] = u.full_name ?? u.username; });

  const refQuery = useQuery({
    queryKey: ["reference", refId],
    queryFn: () => getReference(refId!),
    enabled: !!refId,
    staleTime: 15_000,
  });

  const ref = refQuery.data ?? null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Populate form when entering edit/create mode
  const populatedKey = useRef("");
  useEffect(() => {
    const key = `${mode}:${ref?.id ?? "new"}`;
    if (populatedKey.current === key) return;
    populatedKey.current = key;
    if (mode === "edit" && ref) {
      setForm(refToForm(ref));
    } else if (mode === "create") {
      setForm(EMPTY_FORM);
    }
    setSaveError(null);
  }, [mode, ref?.id]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteReference(refId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["references"] });
      onDeleted();
    },
  });

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const body = formToBody(form);
      const saved = mode === "create"
        ? await createReference(body)
        : await updateReference(refId!, body);
      // Auto-add to current collection when creating
      if (mode === "create" && defaultCollectionId) {
        await addRefToCollection(defaultCollectionId, saved.id).catch(() => null);
      }
      qc.invalidateQueries({ queryKey: ["references"] });
      qc.invalidateQueries({ queryKey: ["reference", saved.id] });
      onSaved(saved.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    if (mode === "create") {
      onClose();
    } else {
      onModeChange("view");
    }
  }

  // ── PDF upload ──────────────────────────────────────────────────────────────
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !refId) return;
    setIsUploadingPdf(true);
    try {
      await uploadPdf(refId, file);
      qc.invalidateQueries({ queryKey: ["reference", refId] });
    } finally {
      setIsUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (mode === "create" || mode === "edit") {
    return (
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <div
          className="px-8 py-4 shrink-0 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <h1 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
            {mode === "create" ? "Nouvelle référence" : "Modifier la référence"}
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-6" style={{ background: "var(--bg)" }}>
          <ReferenceForm
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onCancel={handleCancel}
            isCreating={mode === "create"}
            isSaving={isSaving}
            saveError={saveError}
          />
        </div>
      </div>
    );
  }

  // View mode
  if (!ref) {
    if (refQuery.isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center" style={{ color: "var(--fg-muted)", fontSize: 13 }}>
          Chargement…
        </div>
      );
    }
    return null;
  }

  const authorsDisplay = ref.authors.length > 0 ? ref.authors.join(", ") : null;
  const canEdit = !ref.added_by_id || ref.added_by_id === userId;
  const ownerName = ref.added_by_id ? (userNameMap[ref.added_by_id] ?? null) : null;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      {/* Header */}
      <div
        className="px-8 py-4 shrink-0 flex items-start justify-between gap-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {ref.year && (
              <span
                className="text-xs font-semibold rounded px-2 py-0.5"
                style={{ background: "var(--surface-2)", color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}
              >
                {ref.year}
              </span>
            )}
            {ref.journal && (
              <span className="text-xs italic" style={{ color: "var(--fg-muted)" }}>{ref.journal}</span>
            )}
            {ref.doi && (
              <a
                href={`https://doi.org/${ref.doi}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs"
                style={{ fontFamily: "var(--font-mono)", color: "var(--primary)" }}
              >
                {ref.doi}
              </a>
            )}
            {ownerName && (
              <span className="text-xs rounded px-2 py-0.5" style={{ background: "var(--surface-2)", color: "var(--fg-subtle)" }}>
                {canEdit ? "Ajouté par moi" : `Ajouté par ${ownerName}`}
              </span>
            )}
          </div>
          <h1 className="text-base font-bold leading-snug" style={{ color: "var(--fg)" }}>
            {ref.title}
          </h1>
          {authorsDisplay && (
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>{authorsDisplay}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onModeChange("edit")}
              className="rounded px-3 py-1 text-xs font-medium"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer" }}
            >
              Éditer
            </button>
            <button
              onClick={() => { if (confirm("Supprimer cette référence ?")) deleteMutation.mutate(); }}
              className="rounded px-3 py-1 text-xs font-medium"
              style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", cursor: "pointer" }}
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6" style={{ background: "var(--bg)" }}>

        {/* Abstract */}
        {ref.abstract && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
              Abstract
            </h3>
            <AbstractBlock text={ref.abstract} />
          </section>
        )}

        {/* Notes */}
        {ref.notes && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
              Notes personnelles
            </h3>
            <div
              className="rounded-lg p-4 text-sm whitespace-pre-wrap"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--fg)", lineHeight: 1.6 }}
            >
              {ref.notes}
            </div>
          </section>
        )}

        {/* Tags */}
        {ref.tags.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {ref.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded px-2 py-0.5 text-xs font-medium"
                  style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Collections */}
        <CollectionSection refId={ref.id} currentCollections={ref.collections} />

        {/* PDF */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
            PDF
          </h3>
          <div className="flex items-center gap-2">
            {ref.pdf_path ? (
              <>
                <a
                  href={`/api/files/${ref.pdf_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded px-3 py-1.5 text-xs font-medium"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", textDecoration: "none" }}
                >
                  📄 Ouvrir le PDF
                </a>
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  className="rounded px-3 py-1.5 text-xs"
                  style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
                >
                  {isUploadingPdf ? "Upload…" : "Remplacer"}
                </button>
              </>
            ) : (
              <button
                onClick={() => pdfInputRef.current?.click()}
                className="rounded px-3 py-1.5 text-xs font-medium"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer" }}
              >
                {isUploadingPdf ? "Upload…" : "📎 Joindre un PDF"}
              </button>
            )}
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={handlePdfUpload}
            />
          </div>
          {!ref.pdf_path && (
            <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
              Le PDF doit être associé à une référence déjà créée.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
