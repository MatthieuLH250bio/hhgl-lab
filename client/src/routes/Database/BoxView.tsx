import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { listResource } from "../../api/database";
import { RESOURCE_CONFIGS, RESOURCE_KEYS, ResourceKey } from "./config";

const TYPE_COLOR: Record<ResourceKey, string> = {
  plasmids:     "#6366f1",
  strains:      "#22c55e",
  "cell-lines": "#a855f7",
  primers:      "#f97316",
  antibodies:   "#ef4444",
  viruses:      "#eab308",
};

interface BoxItem {
  id: string;
  code: string;
  name: string;
  resourceKey: ResourceKey;
  box: string;
  well: string;
}

function parseLocation(loc: string): { box: string; well: string } | null {
  const slash = loc.lastIndexOf("/");
  if (slash === -1) return null;
  const box = loc.slice(0, slash).trim();
  const well = loc.slice(slash + 1).trim().toUpperCase();
  if (!box || !well) return null;
  return { box, well };
}

function wellToCoords(well: string): { row: number; col: number } | null {
  const m = well.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let row = 0;
  for (const ch of m[1]) row = row * 26 + ch.charCodeAt(0) - 64;
  return { row: row - 1, col: parseInt(m[2]) - 1 };
}

const ROW_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const CELL = 46;

interface Props {
  onNavigate: (type: ResourceKey, id: string) => void;
}

export default function BoxView({ onNavigate }: Props) {
  const [selectedBox, setSelectedBox] = useState<string | null>(null);

  const results = useQueries({
    queries: RESOURCE_KEYS.map((key) => ({
      queryKey: ["db", key, ""],
      queryFn: () => listResource(RESOURCE_CONFIGS[key].apiPath, { limit: "500" }),
      staleTime: 30_000,
    })),
  });

  const allItems: BoxItem[] = [];
  RESOURCE_KEYS.forEach((key, idx) => {
    const data = (results[idx].data ?? []) as Record<string, unknown>[];
    for (const item of data) {
      const loc = item.box_location;
      if (!loc || typeof loc !== "string") continue;
      const parsed = parseLocation(loc);
      if (!parsed) continue;
      allItems.push({
        id: item.id as string,
        code: String(item.code ?? ""),
        name: String(item.name ?? ""),
        resourceKey: key,
        box: parsed.box,
        well: parsed.well,
      });
    }
  });

  const boxMap = new Map<string, BoxItem[]>();
  for (const item of allItems) {
    const list = boxMap.get(item.box) ?? [];
    list.push(item);
    boxMap.set(item.box, list);
  }
  const boxNames = Array.from(boxMap.keys()).sort();
  const isLoading = results.some((r) => r.isLoading);

  const boxItems = selectedBox ? (boxMap.get(selectedBox) ?? []) : [];
  let maxRow = 7, maxCol = 7;
  const wellMap = new Map<string, BoxItem>();
  for (const item of boxItems) {
    const coords = wellToCoords(item.well);
    if (!coords) continue;
    if (coords.row > maxRow) maxRow = coords.row;
    if (coords.col > maxCol) maxCol = coords.col;
    wellMap.set(item.well, item);
  }
  const gridRows = maxRow + 1;
  const gridCols = maxCol + 1;

  return (
    <div className="flex flex-1 min-w-0 h-full overflow-hidden">
      {/* Box list */}
      <div
        style={{ width: 200, minWidth: 200, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", paddingTop: 12, overflowY: "auto" }}
      >
        <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
          Boîtes ({boxNames.length})
        </p>
        {isLoading && (
          <p className="px-4 text-xs" style={{ color: "var(--fg-subtle)" }}>Chargement…</p>
        )}
        {!isLoading && boxNames.length === 0 && (
          <p className="px-4 text-xs italic" style={{ color: "var(--fg-subtle)", lineHeight: 1.6 }}>
            Aucune localisation.<br />
            Format attendu :<br />
            <span style={{ fontFamily: "var(--font-mono)" }}>BOITE/A1</span>
          </p>
        )}
        {boxNames.map((name) => {
          const count = boxMap.get(name)?.length ?? 0;
          const isActive = selectedBox === name;
          return (
            <button
              key={name}
              onClick={() => setSelectedBox(name)}
              style={{
                background: isActive ? "var(--primary-soft)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--fg-muted)",
                fontWeight: isActive ? 600 : 400,
                border: "none", cursor: "pointer",
                textAlign: "left", padding: "6px 16px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 13, width: "100%",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {name}
              </span>
              <span className="text-xs shrink-0 ml-1" style={{ color: isActive ? "var(--primary)" : "var(--fg-subtle)" }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid area */}
      <div className="flex-1 overflow-auto" style={{ background: "var(--bg)", padding: 32 }}>
        {!selectedBox ? (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--fg-subtle)" }}>
            <span style={{ fontSize: 36 }}>🧊</span>
            <p className="text-sm">Sélectionnez une boîte</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-mono)", color: "var(--fg)" }}>
              {selectedBox}
            </p>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-5">
              {RESOURCE_KEYS.map((key) => {
                if (!boxItems.some((i) => i.resourceKey === key)) return null;
                return (
                  <span key={key} className="flex items-center gap-1.5 text-xs rounded px-2 py-0.5"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLOR[key], display: "inline-block", flexShrink: 0 }} />
                    {RESOURCE_CONFIGS[key].label}
                  </span>
                );
              })}
            </div>

            {/* Grid */}
            <div style={{ display: "inline-block", userSelect: "none" }}>
              {/* Col headers */}
              <div style={{ display: "flex", marginLeft: CELL }}>
                {Array.from({ length: gridCols }, (_, c) => (
                  <div key={c} style={{ width: CELL, textAlign: "center", fontSize: 10, color: "var(--fg-subtle)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                    {c + 1}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {Array.from({ length: gridRows }, (_, r) => (
                <div key={r} style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
                  {/* Row label */}
                  <div style={{ width: CELL - 4, fontSize: 10, color: "var(--fg-subtle)", fontFamily: "var(--font-mono)", textAlign: "center", flexShrink: 0 }}>
                    {ROW_LABELS[r] ?? String.fromCharCode(65 + r)}
                  </div>
                  {/* Cells */}
                  {Array.from({ length: gridCols }, (_, c) => {
                    const wid = `${ROW_LABELS[r] ?? String.fromCharCode(65 + r)}${c + 1}`;
                    const item = wellMap.get(wid);
                    const color = item ? TYPE_COLOR[item.resourceKey] : null;
                    return (
                      <div
                        key={c}
                        onClick={() => { if (item) onNavigate(item.resourceKey, item.id); }}
                        title={item ? `${item.code} — ${item.name} (${RESOURCE_CONFIGS[item.resourceKey].label})` : wid}
                        style={{
                          width: CELL - 6, height: CELL - 6,
                          margin: 3,
                          borderRadius: 5,
                          background: color ? color + "22" : "var(--surface)",
                          border: `1.5px solid ${color ?? "var(--border)"}`,
                          cursor: item ? "pointer" : "default",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "transform 0.08s",
                        }}
                        onMouseEnter={(e) => { if (item) (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                      >
                        {item && (
                          <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: color ?? "var(--fg)", fontWeight: 700, textAlign: "center", padding: "0 2px", lineHeight: 1.2, overflow: "hidden", wordBreak: "break-all" }}>
                            {item.code.length > 6 ? item.code.slice(0, 5) + "…" : item.code}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
