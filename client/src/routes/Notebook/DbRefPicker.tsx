import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listResource } from "../../api/database";
import { RESOURCE_CONFIGS, RESOURCE_KEYS, type ResourceKey } from "../Database/config";

interface Props {
  onSelect: (refType: string, refId: string, refLabel: string) => void;
  onClose: () => void;
}

const TYPE_COLORS: Record<ResourceKey, string> = {
  plasmids:    "#1E5BC6",
  strains:     "#059669",
  "cell-lines":"#7C3AED",
  primers:     "#D97706",
  antibodies:  "#DC2626",
  viruses:     "#0891B2",
};

export default function DbRefPicker({ onSelect, onClose }: Props) {
  const [activeType, setActiveType] = useState<ResourceKey>("plasmids");
  const [query, setQuery] = useState("");

  const config = RESOURCE_CONFIGS[activeType];
  const color = TYPE_COLORS[activeType];

  const { data, isLoading } = useQuery({
    queryKey: ["db", activeType, query],
    queryFn: () => listResource(config.apiPath, { q: query, limit: "30" }),
    staleTime: 30_000,
  });

  const rows = (data ?? []) as Record<string, unknown>[];

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        zIndex: 100,
        width: 420,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: 360,
      }}
    >
      {/* Category tabs */}
      <div className="flex overflow-x-auto" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        {RESOURCE_KEYS.map((key) => (
          <button
            key={key}
            onMouseDown={(e) => { e.preventDefault(); setActiveType(key); setQuery(""); }}
            style={{
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: activeType === key ? 600 : 400,
              color: activeType === key ? TYPE_COLORS[key] : "var(--fg-muted)",
              background: activeType === key ? `color-mix(in oklab, ${TYPE_COLORS[key]} 10%, transparent)` : "transparent",
              border: "none",
              borderBottom: activeType === key ? `2px solid ${TYPE_COLORS[key]}` : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {RESOURCE_CONFIGS[key].label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <input
          autoFocus
          type="search"
          placeholder={`Rechercher dans ${config.label}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
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

      {/* Results */}
      <div className="overflow-y-auto flex-1">
        {isLoading && (
          <p className="px-4 py-3 text-xs" style={{ color: "var(--fg-muted)" }}>Chargement…</p>
        )}
        {!isLoading && rows.length === 0 && (
          <p className="px-4 py-3 text-xs" style={{ color: "var(--fg-subtle)" }}>Aucun résultat</p>
        )}
        {rows.map((row) => {
          const id    = row.id as string;
          const code  = row.code as string;
          const name  = row.name as string ?? "";
          // label kept for future tooltip use
          return (
            <button
              key={id}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(activeType, id, code);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-[var(--surface-2)] transition-colors"
              style={{ background: "transparent", border: "none", cursor: "pointer" }}
            >
              <span
                className="rounded px-1.5 py-0.5 text-xs font-semibold shrink-0"
                style={{ fontFamily: "var(--font-mono)", background: `color-mix(in oklab, ${color} 12%, transparent)`, color }}
              >
                {code}
              </span>
              <span className="text-xs truncate" style={{ color: "var(--fg)" }}>{name}</span>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-1.5" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>Clique pour insérer · Échap pour fermer</span>
      </div>
    </div>
  );
}
