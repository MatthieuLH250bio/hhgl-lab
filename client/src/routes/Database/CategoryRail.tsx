import { RESOURCE_CONFIGS, RESOURCE_KEYS, ResourceKey } from "./config";

interface Props {
  active: ResourceKey;
  counts: Partial<Record<ResourceKey, number>>;
  onChange: (r: ResourceKey) => void;
  viewMode: "table" | "box";
  onViewMode: (m: "table" | "box") => void;
}

export default function CategoryRail({ active, counts, onChange, viewMode, onViewMode }: Props) {
  return (
    <aside
      className="flex flex-col py-3 gap-0.5"
      style={{ width: 200, minWidth: 200, borderRight: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
        Catégories
      </p>
      {RESOURCE_KEYS.map((key) => {
        const isActive = key === active && viewMode === "table";
        const count = counts[key];
        return (
          <button
            key={key}
            onClick={() => { onChange(key); onViewMode("table"); }}
            className="flex items-center justify-between px-4 py-2 text-sm text-left transition-colors w-full"
            style={{
              background: isActive ? "var(--primary-soft)" : "transparent",
              color: isActive ? "var(--primary)" : "var(--fg-muted)",
              fontWeight: isActive ? 600 : 400,
              border: "none",
              cursor: "pointer",
            }}
          >
            <span>{RESOURCE_CONFIGS[key].label}</span>
            {count != null && (
              <span
                className="text-xs rounded px-1.5 py-0.5"
                style={{
                  background: isActive ? "var(--primary-soft)" : "var(--surface-2)",
                  color: isActive ? "var(--primary)" : "var(--fg-subtle)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}

      <div style={{ marginTop: "auto", padding: "12px 8px 0" }}>
        <button
          onClick={() => onViewMode(viewMode === "box" ? "table" : "box")}
          className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm"
          style={{
            background: viewMode === "box" ? "var(--primary-soft)" : "var(--surface-2)",
            color: viewMode === "box" ? "var(--primary)" : "var(--fg-muted)",
            fontWeight: viewMode === "box" ? 600 : 400,
            border: `1px solid ${viewMode === "box" ? "color-mix(in oklab, var(--primary) 30%, transparent)" : "var(--border)"}`,
            cursor: "pointer",
          }}
        >
          <span>🧊</span>
          <span>Vue boîtes</span>
        </button>
      </div>
    </aside>
  );
}
