import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadBlob, svgToImgTag } from "../../../utils/download";

type Format = "6" | "12" | "24" | "96";

const FORMAT_DIMS: Record<Format, { rows: number; cols: number }> = {
  "6":  { rows: 2, cols: 3 },
  "12": { rows: 3, cols: 4 },
  "24": { rows: 4, cols: 6 },
  "96": { rows: 8, cols: 12 },
};

const ROW_LABELS = "ABCDEFGH".split("");
const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#a855f7", "#ec4899",
  "#14b8a6", "#64748b",
];

interface Well { color: string; gene: string; condition: string; time: string; }

const inputSm = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--fg)",
  borderRadius: 4,
  fontSize: 11,
  padding: "4px 8px",
  outline: "none",
  width: "100%",
} as const;

export default function PlateMapPage() {
  const navigate = useNavigate();
  const [format, setFormat] = useState<Format>("96");
  const [wells, setWells] = useState<Record<string, Well>>({});
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [activeGene, setActiveGene] = useState("");
  const [activeCondition, setActiveCondition] = useState("");
  const [activeTime, setActiveTime] = useState("");
  const [painting, setPainting] = useState(false);
  const [erasing, setErasing] = useState(false);

  const { rows, cols } = FORMAT_DIMS[format];
  const WELL_SIZE = format === "96" ? 38 : format === "24" ? 48 : format === "12" ? 58 : 76;

  function wellId(row: number, col: number): string {
    return `${ROW_LABELS[row]}${col + 1}`;
  }

  function paintWell(id: string) {
    if (erasing) {
      setWells((w) => { const copy = { ...w }; delete copy[id]; return copy; });
    } else {
      setWells((w) => ({ ...w, [id]: { color: activeColor, gene: activeGene, condition: activeCondition, time: activeTime } }));
    }
  }

  function buildSVGString(): string {
    const margin = 32;
    const headerH = 20;
    const labelW = 20;
    const gap = 4;
    const gridW = cols * (WELL_SIZE + gap);
    const gridH = rows * (WELL_SIZE + gap);
    const svgW = margin * 2 + labelW + gridW;
    const svgH = margin * 2 + headerH + gridH + 24;

    const wellEls: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = wellId(r, c);
        const w = wells[id];
        const cx = margin + labelW + c * (WELL_SIZE + gap) + WELL_SIZE / 2;
        const cy = margin + headerH + r * (WELL_SIZE + gap) + WELL_SIZE / 2;
        const fill = w?.color ?? "#1e293b";
        const stroke = w?.color ?? "#334155";
        const radius = WELL_SIZE / 2 - 1;
        wellEls.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}88" stroke="${stroke}" stroke-width="1.5"/>`);
        const displayText = w?.condition || w?.time || w?.gene;
        if (displayText) {
          const fs = WELL_SIZE < 40 ? 7 : 9;
          wellEls.push(`<text x="${cx}" y="${cy + fs / 3}" font-size="${fs}" fill="#fff" text-anchor="middle" font-family="monospace">${displayText.slice(0, 5)}</text>`);
        }
      }
    }
    const labelEls: string[] = [];
    for (let c = 0; c < cols; c++) {
      const cx = margin + labelW + c * (WELL_SIZE + gap) + WELL_SIZE / 2;
      labelEls.push(`<text x="${cx}" y="${margin + 14}" font-size="10" fill="#94a3b8" text-anchor="middle" font-family="monospace">${c + 1}</text>`);
    }
    for (let r = 0; r < rows; r++) {
      const cy = margin + headerH + r * (WELL_SIZE + gap) + WELL_SIZE / 2 + 4;
      labelEls.push(`<text x="${margin + 12}" y="${cy}" font-size="10" fill="#94a3b8" text-anchor="middle" font-family="monospace">${ROW_LABELS[r]}</text>`);
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" style="background:#0d1117">
${labelEls.join("\n")}
${wellEls.join("\n")}
<text x="${svgW / 2}" y="${svgH - 8}" font-size="10" fill="#475569" text-anchor="middle" font-family="monospace">${format}-well plate</text>
</svg>`;
  }

  function exportCSV() {
    const lines = ["well,row,col,color,gene,condition,time"];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = wellId(r, c);
        const w = wells[id];
        lines.push(`${id},${ROW_LABELS[r]},${c + 1},${w?.color ?? ""},${w?.gene ?? ""},${w?.condition ?? ""},${w?.time ?? ""}`);
      }
    }
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv" }), `platemap_${format}well.csv`);
  }

  function exportSVG() {
    downloadBlob(new Blob([buildSVGString()], { type: "image/svg+xml" }), `platemap_${format}well.svg`);
  }

  function sendToNotebook() {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const assigned = Object.entries(wells)
      .filter(([, w]) => w.gene || w.condition || w.time || w.color)
      .sort(([a], [b]) => a.localeCompare(b));
    const tableRows = assigned.map(([id, w]) =>
      `<tr>` +
      `<td><strong>${id}</strong></td>` +
      `<td><span style="display:inline-block;width:10px;height:10px;background:${w.color};border-radius:50%;vertical-align:middle;margin-right:4px"></span></td>` +
      `<td>${esc(w.gene)}</td>` +
      `<td>${esc(w.condition)}</td>` +
      `<td>${esc(w.time)}</td>` +
      `</tr>`
    ).join("");
    const tableHtml = assigned.length > 0
      ? `<table><thead><tr><th>Puits</th><th>Couleur</th><th>Gène ciblé</th><th>Condition</th><th>Temps</th></tr></thead><tbody>${tableRows}</tbody></table>`
      : "";
    const body_html =
      `<h3>Plate Map ${format}-well</h3>\n` +
      svgToImgTag(buildSVGString(), `Plate Map ${format}-well`) + "\n" +
      tableHtml +
      `\n<p><em>Généré depuis Plate Map · ${new Date().toLocaleDateString("fr-FR")}</em></p>`;
    navigate("/notebook", { state: { fromTool: { title: `Plate Map ${format}-well`, body_html } } });
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Controls */}
      <div
        className="flex flex-col overflow-y-auto shrink-0"
        style={{ width: 230, borderRight: "1px solid var(--border)", background: "var(--surface)", padding: 16, gap: 16 }}
      >
        {/* Format */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--fg-subtle)" }}>Format</p>
          <div className="grid grid-cols-2 gap-1">
            {(["6", "12", "24", "96"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => { setFormat(f); setWells({}); }}
                style={{
                  background: format === f ? "var(--primary)" : "var(--surface-2)",
                  color: format === f ? "#fff" : "var(--fg-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: 4, padding: "4px 0", fontSize: 12,
                  cursor: "pointer", fontWeight: format === f ? 600 : 400,
                }}
              >
                {f}-well
              </button>
            ))}
          </div>
        </div>

        {/* Palette */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--fg-subtle)" }}>Couleur</p>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => { setActiveColor(c); setErasing(false); }}
                style={{
                  width: 22, height: 22, borderRadius: "50%", background: c,
                  border: activeColor === c && !erasing ? "2.5px solid var(--fg)" : "2px solid transparent",
                  cursor: "pointer", flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-subtle)" }}>Annotation</p>
          <div>
            <label className="text-xs mb-0.5 block" style={{ color: "var(--fg-muted)" }}>Gène ciblé</label>
            <input
              type="text"
              value={activeGene}
              onChange={(e) => setActiveGene(e.target.value)}
              placeholder="ex: BRCA1, GAPDH…"
              style={inputSm}
            />
          </div>
          <div>
            <label className="text-xs mb-0.5 block" style={{ color: "var(--fg-muted)" }}>Condition</label>
            <input
              type="text"
              value={activeCondition}
              onChange={(e) => setActiveCondition(e.target.value)}
              placeholder="ex: siRNA, véhicule…"
              style={inputSm}
            />
          </div>
          <div>
            <label className="text-xs mb-0.5 block" style={{ color: "var(--fg-muted)" }}>Temps</label>
            <input
              type="text"
              value={activeTime}
              onChange={(e) => setActiveTime(e.target.value)}
              placeholder="ex: 24h, J3…"
              style={inputSm}
            />
          </div>
        </div>

        {/* Eraser */}
        <button
          onClick={() => setErasing((e) => !e)}
          style={{
            padding: "5px 0", borderRadius: 4, fontSize: 12,
            background: erasing ? "var(--danger)" : "var(--surface-2)",
            color: erasing ? "#fff" : "var(--fg-muted)",
            border: "1px solid var(--border)", cursor: "pointer",
          }}
        >
          {erasing ? "✕ Effacement actif" : "Gomme"}
        </button>

        {/* Actions */}
        <div className="flex flex-col gap-1 mt-auto">
          <button
            onClick={sendToNotebook}
            style={{ padding: "6px 0", borderRadius: 4, fontSize: 12, background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            → Cahier de labo
          </button>
          <button
            onClick={exportSVG}
            style={{ padding: "6px 0", borderRadius: 4, fontSize: 12, background: "var(--surface-2)", color: "var(--fg-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
          >
            ⬇ SVG
          </button>
          <button
            onClick={exportCSV}
            style={{ padding: "6px 0", borderRadius: 4, fontSize: 12, background: "var(--surface-2)", color: "var(--fg-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
          >
            ⬇ CSV
          </button>
          <button
            onClick={() => setWells({})}
            style={{ padding: "6px 0", borderRadius: 4, fontSize: 12, background: "var(--surface-2)", color: "var(--fg-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
          >
            Effacer tout
          </button>
        </div>
      </div>

      {/* Plate grid */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto"
        style={{ background: "var(--bg)", padding: 32 }}
        onMouseLeave={() => setPainting(false)}
        onMouseUp={() => setPainting(false)}
      >
        <div style={{ display: "inline-block", userSelect: "none" }}>
          {/* Col headers */}
          <div style={{ display: "flex", marginLeft: 24 }}>
            {Array.from({ length: cols }, (_, c) => (
              <div key={c} style={{ width: WELL_SIZE, textAlign: "center", fontSize: 10, color: "var(--fg-subtle)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                {c + 1}
              </div>
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
              <div style={{ width: 20, fontSize: 10, color: "var(--fg-subtle)", fontFamily: "var(--font-mono)", textAlign: "center", marginRight: 4, flexShrink: 0 }}>
                {ROW_LABELS[r]}
              </div>
              {Array.from({ length: cols }, (_, c) => {
                const id = wellId(r, c);
                const well = wells[id];
                const displayText = well?.condition || well?.time || well?.gene || null;
                const maxLen = format === "96" ? 4 : 6;
                const truncText = displayText
                  ? displayText.length > maxLen ? displayText.slice(0, maxLen - 1) + "…" : displayText
                  : null;
                const tooltip = [
                  id,
                  well?.gene ? `Gène: ${well.gene}` : "",
                  well?.condition ? `Condition: ${well.condition}` : "",
                  well?.time ? `Temps: ${well.time}` : "",
                ].filter(Boolean).join(" · ");
                return (
                  <div
                    key={c}
                    style={{
                      width: WELL_SIZE - 4,
                      height: WELL_SIZE - 4,
                      margin: 2,
                      borderRadius: "50%",
                      background: well?.color ? well.color + "33" : "var(--surface-2)",
                      border: `2px solid ${well?.color ?? "var(--border)"}`,
                      cursor: "crosshair",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: format === "96" ? 7 : 9,
                      color: well?.color ? "#fff" : "var(--fg-subtle)",
                      fontFamily: "var(--font-mono)",
                      flexShrink: 0,
                      transition: "background 0.07s",
                    }}
                    onMouseDown={(e) => { e.preventDefault(); setPainting(true); paintWell(id); }}
                    onMouseEnter={() => { if (painting) paintWell(id); }}
                    title={tooltip || id}
                  >
                    {truncText}
                  </div>
                );
              })}
            </div>
          ))}

          <p className="text-center text-xs mt-4" style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-mono)" }}>
            {format}-well · {Object.keys(wells).length} puits assignés
          </p>
        </div>
      </div>
    </div>
  );
}
