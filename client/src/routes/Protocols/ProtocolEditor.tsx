import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { NoteBlock } from "./NoteExtension";

const EDITOR_CSS = `
.protocol-editor .ProseMirror {
  outline: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.7;
  color: var(--fg);
  min-height: 300px;
}
.protocol-editor .ProseMirror h1 { font-size: 1.4em; font-weight: 700; margin: 1.2em 0 0.4em; color: var(--fg); }
.protocol-editor .ProseMirror h2 { font-size: 1.1em; font-weight: 700; margin: 1em 0 0.3em; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.protocol-editor .ProseMirror h3 { font-size: 1em; font-weight: 600; margin: 0.8em 0 0.2em; color: var(--fg); }
.protocol-editor .ProseMirror ul, .protocol-editor .ProseMirror ol { padding-left: 1.4em; margin: 0.4em 0; }
.protocol-editor .ProseMirror li { margin: 0.2em 0; }
.protocol-editor .ProseMirror code { background: var(--surface-2); border-radius: 3px; padding: 1px 5px; font-family: var(--font-mono); font-size: 0.88em; }
.protocol-editor .ProseMirror blockquote { border-left: 3px solid var(--border-strong); margin: 0.6em 0; padding-left: 1em; color: var(--fg-muted); }
.protocol-editor .ProseMirror hr { border: none; border-top: 1px solid var(--border); margin: 1em 0; }
.protocol-editor .ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
.protocol-editor .ProseMirror td, .protocol-editor .ProseMirror th { border: 1px solid var(--border); padding: 6px 10px; font-size: 0.9em; }
.protocol-editor .ProseMirror th { background: var(--surface-2); font-weight: 600; }
.protocol-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--fg-subtle); pointer-events: none; float: left; height: 0; }
.protocol-editor .ProseMirror .protocol-note {
  background: color-mix(in oklab, #D97706 8%, transparent);
  border-left: 3px solid #D97706;
  border-radius: 0 6px 6px 0;
  padding: 10px 14px;
  margin: 0.6em 0;
}
.protocol-editor .ProseMirror .protocol-note::before {
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

const BTN = (active: boolean): React.CSSProperties => ({
  padding: "3px 7px",
  borderRadius: 4,
  border: "none",
  background: active ? "var(--primary-soft)" : "transparent",
  color: active ? "var(--primary)" : "var(--fg-muted)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: active ? 600 : 400,
});

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export default function ProtocolEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      Placeholder.configure({ placeholder: "Rédigez votre protocole…" }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      NoteBlock,
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const inTable = editor.isActive("table");

  return (
    <div className="flex flex-col" style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <style>{EDITOR_CSS}</style>

      {/* Toolbar */}
      <div
        className="flex items-center flex-wrap gap-1 px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
      >
        {/* Headings */}
        {(["H1", "H2", "H3"] as const).map((h) => {
          const level = parseInt(h[1]) as 1 | 2 | 3;
          return (
            <button key={h} style={BTN(editor.isActive("heading", { level }))}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level }).run(); }}>
              {h}
            </button>
          );
        })}
        <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 2px" }} />

        {/* Inline */}
        <button style={BTN(editor.isActive("bold"))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}><b>G</b></button>
        <button style={BTN(editor.isActive("italic"))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}><i>I</i></button>
        <button style={BTN(editor.isActive("highlight"))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight().run(); }}>M</button>
        <button style={BTN(editor.isActive("code"))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}>{"`"}</button>
        <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 2px" }} />

        {/* Lists */}
        <button style={BTN(editor.isActive("bulletList"))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}>•—</button>
        <button style={BTN(editor.isActive("orderedList"))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}>1.</button>
        <button style={BTN(editor.isActive("blockquote"))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}>❝</button>
        <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 2px" }} />

        {/* Table */}
        {!inTable ? (
          <button style={BTN(false)} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }}>⊞ Tableau</button>
        ) : (
          <>
            <button style={BTN(false)} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }}>+Col</button>
            <button style={BTN(false)} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }}>-Col</button>
            <button style={BTN(false)} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }}>+Lig</button>
            <button style={BTN(false)} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }}>-Lig</button>
            <button style={BTN(false)} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }}>✕ Tab</button>
          </>
        )}
        <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 2px" }} />

        {/* Note block */}
        <button
          style={BTN(editor.isActive("noteBlock"))}
          onMouseDown={(e) => {
            e.preventDefault();
            if (editor.isActive("noteBlock")) {
              editor.chain().focus().unsetNoteBlock().run();
            } else {
              editor.chain().focus().setNoteBlock().run();
            }
          }}
          title="Bloc Note / Avertissement"
        >
          ⚠ Note
        </button>
      </div>

      {/* Editor */}
      <div className="protocol-editor px-6 py-4" style={{ background: "var(--bg)" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
