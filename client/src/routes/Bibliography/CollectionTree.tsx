import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
  type Collection,
} from "../../api/bibliography";

interface CollectionNode extends Collection {
  children: CollectionNode[];
}

function buildTree(all: Collection[], parentId: string | null = null): CollectionNode[] {
  return all
    .filter((c) => c.parent_id === parentId)
    .map((c) => ({ ...c, children: buildTree(all, c.id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface FlatItem {
  node: CollectionNode;
  depth: number;
}

function flatten(nodes: CollectionNode[], depth: number, expanded: Set<string>): FlatItem[] {
  const out: FlatItem[] = [];
  for (const node of nodes) {
    out.push({ node, depth });
    if (expanded.has(node.id)) {
      out.push(...flatten(node.children, depth + 1, expanded));
    }
  }
  return out;
}

const INDENT = 16;

// Defined OUTSIDE CollectionTree to keep a stable identity across renders.
// If defined inside, React remounts the input on every parent re-render (new
// component type each time), firing onBlur and preventing the user from typing.
function CreateRow({
  depth,
  value,
  error,
  onChange,
  onConfirm,
  onCancel,
}: {
  depth: number;
  value: string;
  error: string | null;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ paddingLeft: 8 + depth * INDENT, paddingRight: 8, paddingTop: 3, paddingBottom: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 14, flexShrink: 0 }} />
        <span style={{ fontSize: 12 }}>📁</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onConfirm}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Nom du dossier…"
          style={{
            flex: 1,
            background: "var(--surface)",
            border: `1px solid ${error ? "var(--danger)" : "var(--primary)"}`,
            borderRadius: 4,
            padding: "2px 6px",
            fontSize: 12,
            color: "var(--fg)",
            outline: "none",
          }}
        />
      </div>
      {error && (
        <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 2, paddingLeft: 19 }}>
          {error}
        </p>
      )}
    </div>
  );
}

interface Props {
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

export default function CollectionTree({ selectedId, onChange }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [creatingParentId, setCreatingParentId] = useState<string | "root" | null>(null);
  const [creatingName, setCreatingName] = useState("");

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: listCollections,
    staleTime: 30_000,
  });

  const tree = buildTree(collections);
  const items = flatten(tree, 0, expanded);

  const [createError, setCreateError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: ({ name, parent_id }: { name: string; parent_id: string | null }) =>
      createCollection({ name, parent_id }),
    onSuccess: (col) => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      if (col.parent_id) setExpanded((prev) => new Set(prev).add(col.parent_id!));
      setCreatingParentId(null);
      setCreatingName("");
      setCreateError(null);
    },
    onError: (e: Error) => {
      setCreateError(e.message);
    },
  });

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateCollection(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      setEditingId(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCollection,
    onSuccess: (_v, id) => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["references"] });
      if (selectedId === id) onChange(null);
    },
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startCreate(parentId: string | "root") {
    setCreatingParentId(parentId);
    setCreatingName("");
    if (parentId !== "root") {
      setExpanded((prev) => new Set(prev).add(parentId as string));
    }
  }

  function finishCreate() {
    if (!creatingName.trim()) {
      setCreatingParentId(null);
      return;
    }
    createMut.mutate({
      name: creatingName.trim(),
      parent_id: creatingParentId === "root" ? null : (creatingParentId as string),
    });
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditingName(name);
  }

  function finishEdit() {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }
    renameMut.mutate({ id: editingId, name: editingName.trim() });
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Supprimer le dossier "${name}" ?`)) deleteMut.mutate(id);
  }

  const cancelCreate = () => { setCreatingParentId(null); setCreatingName(""); setCreateError(null); };

  return (
    <div
      style={{
        width: 200,
        borderRight: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 12px 8px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--fg-subtle)",
          }}
        >
          Dossiers
        </span>
      </div>

      {/* "All references" */}
      <div
        onClick={() => onChange(null)}
        style={{
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 6,
          paddingBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: selectedId === null ? "var(--primary-soft)" : "transparent",
          cursor: "pointer",
          borderBottom: "1px solid var(--border)",
          userSelect: "none",
        }}
      >
        <span style={{ width: 14, flexShrink: 0 }} />
        <span style={{ fontSize: 13 }}>📚</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: selectedId === null ? 600 : 400,
            color: selectedId === null ? "var(--primary)" : "var(--fg)",
          }}
        >
          Toutes
        </span>
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 4 }}>
        {items.map(({ node, depth }) => {
          const isSelected = selectedId === node.id;
          const isExpanded = expanded.has(node.id);
          const isEditing = editingId === node.id;
          const isHovered = hoveredId === node.id;
          const isCreatingChild = creatingParentId === node.id;
          const hasChildren = node.children.length > 0 || isCreatingChild;

          return (
            <div key={node.id}>
              <div
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => !isEditing && onChange(node.id)}
                style={{
                  paddingLeft: 8 + depth * INDENT,
                  paddingRight: 6,
                  paddingTop: 4,
                  paddingBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: isSelected ? "var(--primary-soft)" : "transparent",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {/* Expand toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                  style={{
                    width: 14,
                    height: 14,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "var(--fg-subtle)",
                    fontSize: 9,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    visibility: hasChildren ? "visible" : "hidden",
                    flexShrink: 0,
                  }}
                >
                  {isExpanded ? "▾" : "▸"}
                </button>

                <span style={{ fontSize: 12, flexShrink: 0 }}>📁</span>

                {isEditing ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={finishEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") finishEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      background: "var(--surface-2)",
                      border: "1px solid var(--primary)",
                      borderRadius: 4,
                      padding: "1px 5px",
                      fontSize: 12,
                      color: "var(--fg)",
                      outline: "none",
                      minWidth: 0,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: isSelected ? "var(--primary)" : "var(--fg)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {node.name}
                  </span>
                )}

                {/* Action buttons — visible on hover */}
                {isHovered && !isEditing && (
                  <div style={{ display: "flex", gap: 1, flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); startCreate(node.id); }}
                      title="Nouveau sous-dossier"
                      style={actionBtnStyle}
                    >
                      +
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(node.id, node.name); }}
                      title="Renommer"
                      style={actionBtnStyle}
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(node.id, node.name); }}
                      title="Supprimer"
                      style={{ ...actionBtnStyle, color: "var(--danger)" }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Inline create row for child */}
              {isCreatingChild && (
                <CreateRow
                  depth={depth + 1}
                  value={creatingName}
                  error={createError}
                  onChange={setCreatingName}
                  onConfirm={finishCreate}
                  onCancel={cancelCreate}
                />
              )}
            </div>
          );
        })}

        {/* Root-level create row */}
        {creatingParentId === "root" && (
          <CreateRow
            depth={0}
            value={creatingName}
            error={createError}
            onChange={setCreatingName}
            onConfirm={finishCreate}
            onCancel={cancelCreate}
          />
        )}
      </div>

      {/* Footer — new root folder */}
      <div style={{ padding: "6px 8px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <button
          onClick={() => startCreate("root")}
          style={{
            width: "100%",
            background: "none",
            border: "1px dashed var(--border)",
            borderRadius: 5,
            padding: "4px 8px",
            fontSize: 11,
            color: "var(--fg-muted)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          + Nouveau dossier
        </button>
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--fg-muted)",
  fontSize: 11,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 3,
  padding: 0,
  flexShrink: 0,
};
