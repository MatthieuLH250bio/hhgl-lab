import { useEffect, useRef } from "react";
import { ColumnDef } from "./config";
import StatusBadge from "./StatusBadge";

interface Props {
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onNew: () => void;
  isLoading: boolean;
  noBorder?: boolean;
}

function CellValue({ value, col }: { value: unknown; col: ColumnDef }) {
  if (value == null) return <span style={{ color: "var(--fg-subtle)" }}>—</span>;
  if (col.key === "status") return <StatusBadge status={String(value)} />;
  if (Array.isArray(value)) {
    return (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)" }}>
        {value.join(", ")}
      </span>
    );
  }
  if (col.mono) {
    return <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{String(value)}</span>;
  }
  return <span>{String(value)}</span>;
}

export default function ResourceTable({ columns, rows, selectedId, onSelect, searchQuery, onSearch, onNew, isLoading, noBorder }: Props) {
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (selectedId) {
      selectedRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedId]);

  return (
    <div className="flex flex-col flex-1 min-w-0" style={noBorder ? undefined : { borderRight: "1px solid var(--border)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <input
          type="search"
          placeholder="Rechercher…"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="flex-1 rounded px-3 py-1.5 text-sm outline-none"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)" }}
        />
        <button
          onClick={onNew}
          className="rounded px-3 py-1.5 text-sm font-medium text-white"
          style={{ background: "var(--primary)", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          + Nouveau
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: "var(--fg-muted)" }}>
            Chargement…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: "var(--fg-muted)" }}>
            Aucun élément
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{
                      color: "var(--fg-subtle)",
                      width: col.width ?? undefined,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = row.id as string;
                const isSelected = id === selectedId;
                return (
                  <tr
                    key={id}
                    ref={isSelected ? selectedRowRef : undefined}
                    onClick={() => onSelect(id)}
                    style={{
                      background: isSelected ? "var(--primary-soft)" : "transparent",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                    className="hover:bg-[var(--surface-2)] transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-2 text-sm" style={{ color: isSelected ? "var(--primary)" : "var(--fg)" }}>
                        <CellValue value={row[col.key]} col={col} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
