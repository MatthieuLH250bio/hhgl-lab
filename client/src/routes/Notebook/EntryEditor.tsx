import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { DbRef } from "./DbRefExtension";
import DbRefPicker from "./DbRefPicker";
import { updateEntry, type Entry } from "../../api/notebook";
import { apiFetch } from "../../api/client";
import { listProtocols, type Protocol } from "../../api/protocols";

interface Props {
  entry: Entry;
  experimentId: string;
  onClose: () => void;
}

// ── Toolbar button ─────────────────────────────────────────────────────────────

function TBtn({
  title, onClick, active, children, disabled,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      disabled={disabled}
      style={{
        background: active ? "var(--primary-soft)" : "transparent",
        border: active ? "1px solid color-mix(in oklab, var(--primary) 30%, transparent)" : "1px solid transparent",
        color: active ? "var(--primary)" : disabled ? "var(--fg-subtle)" : "var(--fg-muted)",
        borderRadius: 4,
        padding: "3px 8px",
        cursor: disabled ? "default" : "pointer",
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.5,
        minWidth: 28,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 3px", alignSelf: "center", flexShrink: 0 }} />;
}

// ── Editor styles injected once ────────────────────────────────────────────────

const EDITOR_CSS = `
.tiptap-editor .ProseMirror {
  outline: none;
  padding: 32px 48px;
  min-height: 100%;
  font-size: 14px;
  line-height: 1.75;
  color: var(--fg);
  font-family: inherit;
}
.tiptap-editor .ProseMirror h1 { font-size: 1.6em; font-weight: 700; margin: 1.2em 0 0.4em; }
.tiptap-editor .ProseMirror h2 { font-size: 1.25em; font-weight: 700; margin: 1.1em 0 0.4em; }
.tiptap-editor .ProseMirror h3 { font-size: 1.05em; font-weight: 600; margin: 1em 0 0.4em; }
.tiptap-editor .ProseMirror p  { margin: 0.4em 0; }
.tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 1.5em; margin: 0.4em 0; }
.tiptap-editor .ProseMirror li { margin: 0.2em 0; }
.tiptap-editor .ProseMirror code { font-family: var(--font-mono); font-size: 0.87em; background: var(--surface-2); border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px; }
.tiptap-editor .ProseMirror pre { background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; overflow-x: auto; margin: 0.8em 0; }
.tiptap-editor .ProseMirror pre code { background: none; border: none; padding: 0; font-size: 0.9em; }
.tiptap-editor .ProseMirror blockquote { border-left: 3px solid var(--primary); padding-left: 1em; color: var(--fg-muted); margin: 0.8em 0; }
.tiptap-editor .ProseMirror hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
.tiptap-editor .ProseMirror mark { background: #FDE68A; color: #92400E; padding: 1px 3px; border-radius: 3px; }
.tiptap-editor .ProseMirror img { max-width: 100%; border-radius: 6px; margin: 0.5em 0; border: 1px solid var(--border); cursor: pointer; }
.tiptap-editor .ProseMirror img.ProseMirror-selectednode { outline: 2px solid var(--primary); }
.tiptap-editor .ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 0.9em; }
.tiptap-editor .ProseMirror th, .tiptap-editor .ProseMirror td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; vertical-align: top; min-width: 60px; }
.tiptap-editor .ProseMirror th { background: var(--surface-2); font-weight: 600; }
.tiptap-editor .ProseMirror .selectedCell { background: var(--primary-soft); }
.tiptap-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--fg-subtle); pointer-events: none; float: left; height: 0; }
`;

// ── Main component ─────────────────────────────────────────────────────────────

export default function EntryEditor({ entry, experimentId, onClose }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(entry.title);
  const [date, setDate] = useState(entry.entry_date);
  const [tags, setTags] = useState((entry.tags ?? []).join(", "));
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(
    entry.protocol_id
      ? { id: entry.protocol_id, code: entry.protocol_code ?? "", title: entry.protocol_title ?? "" } as Protocol
      : null
  );
  const [protocolSearch, setProtocolSearch] = useState("");
  const [showProtocolPicker, setShowProtocolPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showRefPicker, setShowRefPicker] = useState(false);
  const citeButtonRef = useRef<HTMLDivElement>(null);
  const protocolPickerRef = useRef<HTMLDivElement>(null);

  const protocolsQuery = useQuery({
    queryKey: ["protocols", protocolSearch],
    queryFn: () => listProtocols(protocolSearch),
    staleTime: 30_000,
    enabled: showProtocolPicker,
  });

  // Close protocol picker on outside click
  useEffect(() => {
    if (!showProtocolPicker) return;
    const handler = (e: MouseEvent) => {
      if (!protocolPickerRef.current?.contains(e.target as Node)) {
        setShowProtocolPicker(false);
        setProtocolSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProtocolPicker]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      DbRef,
      Placeholder.configure({ placeholder: "Rédige tes notes…\n\nCommence par un ## Titre de section, puis décris ton protocole et tes observations." }),
    ],
    content: entry.body_md ?? "",
    editorProps: {
      attributes: { class: "tiptap-editor" },
    },
  });

  useEffect(() => {
    if (editor && entry.id) {
      editor.commands.setContent(entry.body_md ?? "");
      setTitle(entry.title);
      setDate(entry.entry_date);
      setTags((entry.tags ?? []).join(", "));
      setSelectedProtocol(
        entry.protocol_id
          ? { id: entry.protocol_id, code: entry.protocol_code ?? "", title: entry.protocol_title ?? "" } as Protocol
          : null
      );
    }
  }, [entry.id]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateEntry(entry.id, {
        title,
        body_md: editor?.getHTML() ?? "",
        entry_date: date,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        protocol_id: selectedProtocol?.id ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entry", entry.id] });
      qc.invalidateQueries({ queryKey: ["entries", experimentId] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "image");
      const res = await apiFetch(`/api/entries/${entry.id}/attachments`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload échoué");
      const att = await res.json() as { storage_path: string };
      editor?.chain().focus().setImage({ src: `/api/files/${att.storage_path}` }).run();
      qc.invalidateQueries({ queryKey: ["entry", entry.id] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--fg)",
    borderRadius: 6,
    fontSize: 13,
    padding: "6px 10px",
    outline: "none",
  };

  if (!editor) return null;

  const isTable = editor.isActive("table");

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      {/* Inject editor CSS once */}
      <style>{EDITOR_CSS}</style>

      {/* Top bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <span className="flex-1" />
        {error && <span className="text-xs" style={{ color: "var(--danger)" }}>{error}</span>}
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="rounded px-3 py-1 text-xs font-medium text-white"
          style={{ background: "var(--primary)", border: "none", cursor: "pointer" }}
        >
          {saveMutation.isPending ? "…" : "Sauvegarder"}
        </button>
        <button
          onClick={onClose}
          className="rounded px-3 py-1 text-xs font-medium"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
        >
          Annuler
        </button>
      </div>

      {/* Meta */}
      <div
        className="flex items-center gap-3 px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" style={{ ...inputStyle, flex: 2, fontSize: 15, fontWeight: 600 }} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: 140 }} />
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags séparés par virgule" style={{ ...inputStyle, flex: 1 }} />

        {/* Protocol picker */}
        <div ref={protocolPickerRef} style={{ position: "relative", flexShrink: 0 }}>
          {selectedProtocol ? (
            <div className="flex items-center gap-1 rounded px-2 py-1"
              style={{ background: "color-mix(in oklab, #EAB308 12%, transparent)", border: "1px solid color-mix(in oklab, #EAB308 30%, transparent)" }}>
              <span className="text-xs font-medium" style={{ color: "#b45309" }}>
                {selectedProtocol.code} — {selectedProtocol.title}
              </span>
              <button
                onClick={() => setSelectedProtocol(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#b45309", fontSize: 12, lineHeight: 1, padding: "0 2px" }}
                title="Retirer le protocole"
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowProtocolPicker((v) => !v)}
              className="rounded px-2 py-1 text-xs"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              + Protocole
            </button>
          )}

          {showProtocolPicker && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 6, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                width: 280, overflow: "hidden",
              }}
            >
              <div className="px-2 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <input
                  autoFocus
                  value={protocolSearch}
                  onChange={(e) => setProtocolSearch(e.target.value)}
                  placeholder="Rechercher un protocole…"
                  className="w-full text-xs px-2 py-1.5 rounded"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", outline: "none" }}
                />
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {protocolsQuery.isLoading && (
                  <p className="px-3 py-2 text-xs" style={{ color: "var(--fg-muted)" }}>Chargement…</p>
                )}
                {protocolsQuery.data?.length === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: "var(--fg-muted)" }}>Aucun protocole trouvé</p>
                )}
                {protocolsQuery.data?.map((p: Protocol) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProtocol(p);
                      setShowProtocolPicker(false);
                      setProtocolSearch("");
                    }}
                    className="w-full text-left px-3 py-2 flex flex-col gap-0.5"
                    style={{ background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                  >
                    <span className="text-xs font-medium" style={{ color: "var(--fg)" }}>{p.title}</span>
                    <span className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "var(--fg-subtle)" }}>
                      {p.code}{p.category ? ` · ${p.category}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formatting toolbar */}
      <div
        className="flex items-center gap-0.5 px-3 py-1.5 shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {/* Titres */}
        <TBtn title="Titre 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>H1</TBtn>
        <TBtn title="Titre 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>H2</TBtn>
        <TBtn title="Titre 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>H3</TBtn>

        <Sep />

        {/* Inline */}
        <TBtn title="Gras (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <strong>G</strong>
        </TBtn>
        <TBtn title="Italique (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <em>I</em>
        </TBtn>
        <TBtn title="Barré" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>
          <span style={{ textDecoration: "line-through" }}>S</span>
        </TBtn>
        <TBtn title="Surligné" onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")}>
          <span style={{ background: "#FDE68A", color: "#92400E", padding: "0 3px", borderRadius: 2, fontSize: 11 }}>M</span>
        </TBtn>
        <TBtn title="Code inline" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")}>
          <span style={{ fontFamily: "monospace", fontSize: 11 }}>{"<>"}</span>
        </TBtn>

        <Sep />

        {/* Blocs */}
        <TBtn title="Liste à puces" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>• —</TBtn>
        <TBtn title="Liste numérotée" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>1.</TBtn>
        <TBtn title="Bloc de code" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>
          <span style={{ fontFamily: "monospace", fontSize: 10 }}>{"</>"}</span>
        </TBtn>
        <TBtn title="Citation" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>❝</TBtn>
        <TBtn title="Ligne séparatrice" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</TBtn>

        <Sep />

        {/* Tableau */}
        {!isTable ? (
          <TBtn
            title="Insérer un tableau"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            ⊞ Tableau
          </TBtn>
        ) : (
          <>
            <TBtn title="Ajouter colonne" onClick={() => editor.chain().focus().addColumnAfter().run()}>+Col</TBtn>
            <TBtn title="Ajouter ligne" onClick={() => editor.chain().focus().addRowAfter().run()}>+Lig</TBtn>
            <TBtn title="Supprimer colonne" onClick={() => editor.chain().focus().deleteColumn().run()}>-Col</TBtn>
            <TBtn title="Supprimer ligne" onClick={() => editor.chain().focus().deleteRow().run()}>-Lig</TBtn>
            <TBtn title="Supprimer tableau" onClick={() => editor.chain().focus().deleteTable().run()}>✕ Tab</TBtn>
          </>
        )}

        <Sep />

        {/* Image */}
        <TBtn title="Insérer une image" onClick={() => document.getElementById("img-upload-input")?.click()}>
          {uploading ? "…" : "🖼 Image"}
        </TBtn>
        <input
          id="img-upload-input"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />

        <Sep />

        {/* Citer un élément DB */}
        <div ref={citeButtonRef} style={{ position: "relative" }}>
          <TBtn
            title="Citer un élément de la base de données"
            onClick={() => setShowRefPicker((v) => !v)}
            active={showRefPicker}
          >
            @ Citer
          </TBtn>
          {showRefPicker && (
            <DbRefPicker
              onSelect={(refType, refId, refLabel) => {
                editor.chain().focus().insertDbRef({ refType, refId, refLabel }).run();
              }}
              onClose={() => setShowRefPicker(false)}
            />
          )}
        </div>
      </div>

      {/* Tiptap editor */}
      <div className="flex-1 overflow-y-auto tiptap-editor" style={{ background: "var(--bg)" }}>
        <EditorContent editor={editor} style={{ minHeight: "100%", fontFamily: "inherit" }} />
      </div>
    </div>
  );
}
