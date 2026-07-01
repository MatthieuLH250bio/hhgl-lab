import type { Protocol } from "../../api/protocols";

interface Props {
  protocols: Protocol[];
  selectedId: string | null;
  isLoading: boolean;
  searchQuery: string;
  activeCategory: string | null;
  onSearch: (q: string) => void;
  onCategoryChange: (c: string | null) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function ProtocolList({
  protocols,
  selectedId,
  isLoading,
  searchQuery,
  activeCategory,
  onSearch,
  onCategoryChange,
  onSelect,
  onNew,
}: Props) {
  // Derive categories from the full list (before category filter)
  const categoryCounts = protocols.reduce<Record<string, number>>((acc, p) => {
    if (p.category) acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});
  const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div
      className="flex flex-col shrink-0"
      style={{ width: 300, borderRight: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>Protocoles</h2>
            <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>{protocols.length} protocole{protocols.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={onNew}
            className="rounded px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer" }}
          >
            + Nouveau
          </button>
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Rechercher…"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          style={{
            width: "100%",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 5,
            padding: "5px 10px",
            fontSize: 12,
            color: "var(--fg)",
            outline: "none",
          }}
        />
      </div>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div
          className="flex overflow-x-auto gap-1 px-3 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
        >
          <button
            onClick={() => onCategoryChange(null)}
            className="rounded-full px-2.5 py-0.5 text-xs shrink-0 font-medium"
            style={{
              background: activeCategory === null ? "var(--primary)" : "var(--surface)",
              color: activeCategory === null ? "#fff" : "var(--fg-muted)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Tous
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className="rounded-full px-2.5 py-0.5 text-xs shrink-0"
              style={{
                background: activeCategory === cat ? "var(--primary)" : "var(--surface)",
                color: activeCategory === cat ? "#fff" : "var(--fg-muted)",
                border: "1px solid var(--border)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {cat} {count}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <p className="px-4 py-3 text-xs" style={{ color: "var(--fg-muted)" }}>Chargement…</p>
        )}
        {!isLoading && protocols.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>Aucun protocole</p>
          </div>
        )}
        {protocols.map((p) => {
          const isSelected = selectedId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors"
              style={{
                background: isSelected ? "var(--primary-soft)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                borderLeft: isSelected ? "3px solid var(--primary)" : "3px solid transparent",
                cursor: "pointer",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-xs shrink-0"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--fg-subtle)" }}
                  >
                    {p.code}
                  </span>
                  {p.category && (
                    <span
                      className="rounded px-1.5 py-0.5 text-xs shrink-0"
                      style={{ background: "var(--surface-2)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}
                    >
                      {p.category}
                    </span>
                  )}
                </div>
                <span className="text-xs shrink-0" style={{ color: "var(--fg-subtle)" }}>
                  {formatDate(p.updated_at)}
                </span>
              </div>

              <p
                className="text-sm font-semibold leading-snug truncate"
                style={{ color: isSelected ? "var(--primary)" : "var(--fg)" }}
              >
                {p.is_favorite && <span style={{ marginRight: 4 }}>⭐</span>}
                {p.title}
              </p>

              {(p.duration || p.author_name) && (
                <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                  {[p.duration && `⏱ ${p.duration}`, p.author_name && `· ${p.author_name}`]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
