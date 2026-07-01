import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadBlob, svgToImgTag } from "../../../utils/download";

function uid() { return Math.random().toString(36).slice(2, 8); }

const COLORS = ["#6366f1", "#22c55e", "#f97316", "#ef4444", "#06b6d4", "#a855f7", "#eab308", "#ec4899"];
const UNITS = ["OD600", "c/mL", "c/cm²", "UFC/mL", "RLU"];

interface Point { id: string; time: string; value: string; }
interface Series { id: string; name: string; color: string; unit: string; points: Point[]; }

function emptyPoint(): Point { return { id: uid(), time: "", value: "" }; }
function emptySeries(n: number): Series {
  return { id: uid(), name: `Série ${n}`, color: COLORS[(n - 1) % COLORS.length], unit: "OD600", points: [emptyPoint(), emptyPoint(), emptyPoint()] };
}

function linReg(xs: number[], ys: number[]): { slope: number } | null {
  const n = xs.length;
  if (n < 2) return null;
  const sx = xs.reduce((a, b) => a + b, 0), sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0), sx2 = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sx2 - sx * sx;
  if (denom === 0) return null;
  return { slope: (n * sxy - sx * sy) / denom };
}

function doublingTime(pts: { t: number; v: number }[]): number | null {
  const valid = pts.filter((p) => p.v > 0);
  if (valid.length < 2) return null;
  const reg = linReg(valid.map((p) => p.t), valid.map((p) => Math.log2(p.v)));
  if (!reg || reg.slope <= 0) return null;
  return 1 / reg.slope;
}

// ── Chart ─────────────────────────────────────────────────────────────────────

const CW = 480, CH = 260, PL = 56, PT = 16, PR = 16, PB = 44;

function GrowthChart({ series, logScale, timeUnit }: { series: Series[]; logScale: boolean; timeUnit: string }) {
  const allPts: { t: number; v: number }[] = [];
  series.forEach((s) => s.points.forEach((p) => {
    const t = parseFloat(p.time), v = parseFloat(p.value);
    if (!isNaN(t) && !isNaN(v) && v > 0) allPts.push({ t, v });
  }));

  if (allPts.length < 2) {
    return <p className="text-xs italic" style={{ color: "var(--fg-subtle)" }}>Saisissez des données pour afficher le graphe.</p>;
  }

  const minT = Math.min(...allPts.map((p) => p.t));
  const maxT = Math.max(...allPts.map((p) => p.t));
  const rawMaxV = Math.max(...allPts.map((p) => p.v));
  const rawMinV = Math.min(...allPts.map((p) => p.v));
  const maxV = rawMaxV * 1.12;
  const minV = logScale ? rawMinV * 0.8 : 0;

  const xOf = (t: number) => PL + ((t - minT) / (maxT - minT || 1)) * (CW - PL - PR);
  const yOf = (v: number) => {
    if (logScale) {
      const lo = Math.log10(Math.max(minV, 1e-12)), hi = Math.log10(Math.max(maxV, 1e-11));
      return PT + (1 - (Math.log10(v) - lo) / (hi - lo || 1)) * CH;
    }
    return PT + (1 - (v - minV) / (maxV - minV || 1)) * CH;
  };

  // Y ticks
  const yTicks: number[] = [];
  if (logScale) {
    const lo = Math.floor(Math.log10(rawMinV || 0.001)), hi = Math.ceil(Math.log10(rawMaxV));
    for (let e = lo; e <= hi; e++) yTicks.push(10 ** e);
  } else {
    for (let i = 0; i <= 5; i++) yTicks.push((maxV * i) / 5);
  }

  // X ticks
  const xRange = maxT - minT || 1;
  const xStep = Math.pow(10, Math.floor(Math.log10(xRange / 5)));
  const xTicks: number[] = [];
  const xFirst = Math.ceil(minT / xStep) * xStep;
  for (let t = xFirst; t <= maxT + 1e-9; t = parseFloat((t + xStep).toFixed(10))) xTicks.push(t);

  const svgH = PT + CH + PB;

  return (
    <svg width={CW} height={svgH} style={{ fontFamily: "var(--font-mono)", display: "block", maxWidth: "100%" }}>
      <line x1={PL} y1={PT} x2={PL} y2={PT + CH} stroke="var(--border)" strokeWidth={1} />
      <line x1={PL} y1={PT + CH} x2={CW - PR} y2={PT + CH} stroke="var(--border)" strokeWidth={1} />

      {yTicks.map((v) => {
        const y = yOf(v);
        if (y < PT - 2 || y > PT + CH + 2) return null;
        const label = logScale
          ? v >= 1000 ? `${v / 1000}k` : v < 0.01 ? v.toExponential(0) : String(v)
          : v.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
        return (
          <g key={v}>
            <line x1={PL} y1={y} x2={CW - PR} y2={y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3,3" />
            <text x={PL - 5} y={y + 4} fontSize={9} fill="var(--fg-subtle)" textAnchor="end">{label}</text>
          </g>
        );
      })}

      {xTicks.map((t) => {
        const x = xOf(t);
        return (
          <g key={t}>
            <line x1={x} y1={PT + CH} x2={x} y2={PT + CH + 4} stroke="var(--border)" strokeWidth={1} />
            <text x={x} y={PT + CH + 14} fontSize={9} fill="var(--fg-subtle)" textAnchor="middle">{t}</text>
          </g>
        );
      })}

      <text x={PL + (CW - PL - PR) / 2} y={svgH - 2} fontSize={9} fill="var(--fg-subtle)" textAnchor="middle">
        Temps ({timeUnit})
      </text>

      {series.map((s) => {
        const pts = s.points
          .map((p) => ({ t: parseFloat(p.time), v: parseFloat(p.value) }))
          .filter((p) => !isNaN(p.t) && !isNaN(p.v) && p.v > 0)
          .sort((a, b) => a.t - b.t);
        if (pts.length === 0) return null;
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t)},${yOf(p.v)}`).join(" ");
        return (
          <g key={s.id}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={2} opacity={0.85} />
            {pts.map((p, i) => <circle key={i} cx={xOf(p.t)} cy={yOf(p.v)} r={4} fill={s.color} opacity={0.9} />)}
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG string (for notebook export) ──────────────────────────────────────────

function buildGrowthSVGString(series: Series[], logScale: boolean, timeUnit: string): string {
  const allPts: { t: number; v: number }[] = [];
  series.forEach((s) => s.points.forEach((p) => {
    const t = parseFloat(p.time), v = parseFloat(p.value);
    if (!isNaN(t) && !isNaN(v) && v > 0) allPts.push({ t, v });
  }));
  if (allPts.length < 2) return "";

  const minT = Math.min(...allPts.map((p) => p.t));
  const maxT = Math.max(...allPts.map((p) => p.t));
  const rawMaxV = Math.max(...allPts.map((p) => p.v));
  const rawMinV = Math.min(...allPts.map((p) => p.v));
  const maxV = rawMaxV * 1.12;
  const minV = logScale ? rawMinV * 0.8 : 0;

  const xOf = (t: number) => PL + ((t - minT) / (maxT - minT || 1)) * (CW - PL - PR);
  const yOf = (v: number) => {
    if (logScale) {
      const lo = Math.log10(Math.max(minV, 1e-12)), hi = Math.log10(Math.max(maxV, 1e-11));
      return PT + (1 - (Math.log10(v) - lo) / (hi - lo || 1)) * CH;
    }
    return PT + (1 - (v - minV) / (maxV - minV || 1)) * CH;
  };

  const yTicks: number[] = [];
  if (logScale) {
    const lo = Math.floor(Math.log10(rawMinV || 0.001)), hi = Math.ceil(Math.log10(rawMaxV));
    for (let e = lo; e <= hi; e++) yTicks.push(10 ** e);
  } else {
    for (let i = 0; i <= 5; i++) yTicks.push((maxV * i) / 5);
  }

  const xRange = maxT - minT || 1;
  const xStep = Math.pow(10, Math.floor(Math.log10(xRange / 5)));
  const xTicks: number[] = [];
  const xFirst = Math.ceil(minT / xStep) * xStep;
  for (let t = xFirst; t <= maxT + 1e-9; t = parseFloat((t + xStep).toFixed(10))) xTicks.push(t);

  const svgH = PT + CH + PB;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const yTickSvg = yTicks.map((v) => {
    const y = yOf(v);
    if (y < PT - 2 || y > PT + CH + 2) return "";
    const label = logScale
      ? v >= 1000 ? `${v / 1000}k` : v < 0.01 ? v.toExponential(0) : String(v)
      : v.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
    return `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${CW - PR}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="3,3"/>` +
      `<text x="${PL - 5}" y="${(y + 4).toFixed(1)}" font-size="9" fill="#64748b" text-anchor="end">${label}</text>`;
  }).join("");

  const xTickSvg = xTicks.map((t) => {
    const x = xOf(t);
    return `<line x1="${x.toFixed(1)}" y1="${PT + CH}" x2="${x.toFixed(1)}" y2="${PT + CH + 4}" stroke="#94a3b8" stroke-width="1"/>` +
      `<text x="${x.toFixed(1)}" y="${PT + CH + 14}" font-size="9" fill="#64748b" text-anchor="middle">${t}</text>`;
  }).join("");

  const seriesSvg = series.map((s) => {
    const pts = s.points
      .map((p) => ({ t: parseFloat(p.time), v: parseFloat(p.value) }))
      .filter((p) => !isNaN(p.t) && !isNaN(p.v) && p.v > 0)
      .sort((a, b) => a.t - b.t);
    if (pts.length === 0) return "";
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(" ");
    const dots = pts.map((p, i) => `<circle key="${i}" cx="${xOf(p.t).toFixed(1)}" cy="${yOf(p.v).toFixed(1)}" r="4" fill="${s.color}" opacity="0.9"/>`).join("");
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" opacity="0.85"/>` + dots;
  }).join("");

  const legendH = 20;
  const legendSvg = series.map((s, i) =>
    `<g transform="translate(${PL + i * 130},${svgH + 4})">` +
    `<circle cx="5" cy="5" r="5" fill="${s.color}"/>` +
    `<text x="14" y="9" font-size="9" fill="#334155">${esc(s.name)} (${esc(s.unit)})</text>` +
    `</g>`
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${svgH + legendH}" font-family="monospace" style="background:#f8fafc">` +
    `<line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT + CH}" stroke="#94a3b8" stroke-width="1"/>` +
    `<line x1="${PL}" y1="${PT + CH}" x2="${CW - PR}" y2="${PT + CH}" stroke="#94a3b8" stroke-width="1"/>` +
    yTickSvg + xTickSvg + seriesSvg +
    `<text x="${(PL + (CW - PL - PR) / 2).toFixed(1)}" y="${svgH - 4}" font-size="9" fill="#64748b" text-anchor="middle">Temps (${esc(timeUnit)})</text>` +
    legendSvg +
    `</svg>`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

const inputSm = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--fg)",
  borderRadius: 4,
  fontSize: 11,
  padding: "3px 7px",
  outline: "none",
} as const;

export default function GrowthCurvePage() {
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series[]>([emptySeries(1), emptySeries(2)]);
  const [logScale, setLogScale] = useState(false);
  const [timeUnit, setTimeUnit] = useState("h");

  function addSeries() { setSeries((ss) => [...ss, emptySeries(ss.length + 1)]); }
  function removeSeries(id: string) { setSeries((ss) => ss.filter((s) => s.id !== id)); }
  function updateSeries(id: string, patch: Partial<Series>) { setSeries((ss) => ss.map((s) => s.id === id ? { ...s, ...patch } : s)); }
  function addPoint(sid: string) { setSeries((ss) => ss.map((s) => s.id === sid ? { ...s, points: [...s.points, emptyPoint()] } : s)); }
  function removePoint(sid: string, pid: string) { setSeries((ss) => ss.map((s) => s.id === sid ? { ...s, points: s.points.filter((p) => p.id !== pid) } : s)); }
  function updatePoint(sid: string, pid: string, field: "time" | "value", val: string) {
    setSeries((ss) => ss.map((s) => s.id === sid ? { ...s, points: s.points.map((p) => p.id === pid ? { ...p, [field]: val } : p) } : s));
  }

  function exportCSV() {
    const lines = ["series,time,value,unit"];
    series.forEach((s) => s.points.forEach((p) => {
      if (p.time !== "" || p.value !== "") lines.push(`${s.name},${p.time},${p.value},${s.unit}`);
    }));
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv" }), "growth_curve.csv");
  }

  function sendToNotebook() {
    const svgStr = buildGrowthSVGString(series, logScale, timeUnit);
    if (!svgStr) return;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const tableRows = series.map((s) => {
      const pts = s.points
        .map((p) => ({ t: parseFloat(p.time), v: parseFloat(p.value) }))
        .filter((p) => !isNaN(p.t) && !isNaN(p.v) && p.v > 0);
      const dt = doublingTime(pts);
      const k = dt !== null ? Math.LN2 / (dt * Math.LOG2E) : null;
      return `<tr>` +
        `<td><span style="display:inline-block;width:10px;height:10px;background:${s.color};border-radius:50%;vertical-align:middle;margin-right:4px"></span>${esc(s.name)}</td>` +
        `<td>${esc(s.unit)}</td>` +
        `<td>${dt !== null ? `${dt.toFixed(2)} ${esc(timeUnit)}` : "—"}</td>` +
        `<td>${k !== null ? `${k.toFixed(4)} ${esc(timeUnit)}⁻¹` : "—"}</td>` +
        `</tr>`;
    }).join("");
    const tableHtml = `<table><thead><tr><th>Série</th><th>Unité</th><th>Temps de doublement</th><th>μ (taux de croissance)</th></tr></thead><tbody>${tableRows}</tbody></table>`;
    const title = `Courbe de croissance${logScale ? " (log)" : ""}`;
    const body_html =
      `<h3>${title}</h3>\n` +
      svgToImgTag(svgStr, title) + "\n" +
      tableHtml +
      `\n<p><em>Régression linéaire sur log₂(valeur) vs temps. Généré le ${new Date().toLocaleDateString("fr-FR")}</em></p>`;
    navigate("/notebook", { state: { fromTool: { title, body_html } } });
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* ── Left: controls ── */}
      <div className="flex flex-col overflow-y-auto shrink-0"
        style={{ width: 300, borderRight: "1px solid var(--border)", background: "var(--surface)", padding: 16, gap: 14 }}>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--fg-subtle)" }}>Options</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs shrink-0" style={{ color: "var(--fg-muted)", width: 50 }}>Temps</label>
              <select value={timeUnit} onChange={(e) => setTimeUnit(e.target.value)} style={{ ...inputSm, flex: 1 }}>
                {["s", "min", "h", "j"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--fg-muted)" }}>
              <input type="checkbox" checked={logScale} onChange={(e) => setLogScale(e.target.checked)} style={{ accentColor: "var(--primary)" }} />
              Échelle logarithmique
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-subtle)" }}>
              Séries ({series.length})
            </p>
            <button onClick={addSeries} disabled={series.length >= 8}
              style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 4, padding: "2px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600, opacity: series.length >= 8 ? 0.5 : 1 }}>
              + Série
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {series.map((s) => (
              <div key={s.id}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: 10 }}>
                <div className="flex items-center gap-1 mb-2">
                  <input type="color" value={s.color} onChange={(e) => updateSeries(s.id, { color: e.target.value })}
                    style={{ width: 22, height: 22, border: "none", borderRadius: 3, cursor: "pointer", padding: 0, background: "none" }} />
                  <input type="text" value={s.name} onChange={(e) => updateSeries(s.id, { name: e.target.value })}
                    style={{ ...inputSm, flex: 1 }} placeholder="Nom" />
                  <select value={s.unit} onChange={(e) => updateSeries(s.id, { unit: e.target.value })}
                    style={{ ...inputSm, width: 72 }}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {series.length > 1 && (
                    <button onClick={() => removeSeries(s.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: 13, flexShrink: 0 }}>✕</button>
                  )}
                </div>

                <div className="flex gap-1 mb-1">
                  <span className="text-xs text-center" style={{ flex: 1, color: "var(--fg-subtle)" }}>t ({timeUnit})</span>
                  <span className="text-xs text-center" style={{ flex: 1, color: "var(--fg-subtle)" }}>{s.unit}</span>
                  <span style={{ width: 18 }} />
                </div>

                {s.points.map((p) => (
                  <div key={p.id} className="flex gap-1 mb-1 items-center">
                    <input type="number" step="any" placeholder="0" value={p.time}
                      onChange={(e) => updatePoint(s.id, p.id, "time", e.target.value)}
                      style={{ ...inputSm, flex: 1 }} />
                    <input type="number" step="any" placeholder="0" value={p.value}
                      onChange={(e) => updatePoint(s.id, p.id, "value", e.target.value)}
                      style={{ ...inputSm, flex: 1 }} />
                    <button onClick={() => removePoint(s.id, p.id)} disabled={s.points.length === 1}
                      style={{ background: "none", border: "none", cursor: s.points.length === 1 ? "default" : "pointer", color: "var(--fg-subtle)", fontSize: 11, width: 18, flexShrink: 0, opacity: s.points.length === 1 ? 0.3 : 1 }}>×</button>
                  </div>
                ))}

                <button onClick={() => addPoint(s.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 11, padding: 0, marginTop: 2 }}>
                  + point
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-auto">
          <button onClick={sendToNotebook}
            style={{ padding: "7px 0", borderRadius: 4, fontSize: 12, background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>
            → Cahier de labo
          </button>
          <button onClick={exportCSV}
            style={{ padding: "7px 0", borderRadius: 4, fontSize: 12, background: "var(--surface-2)", color: "var(--fg-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
            ⬇ Exporter CSV
          </button>
        </div>
      </div>

      {/* ── Right: chart + stats ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6" style={{ background: "var(--bg)" }}>
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--fg-subtle)" }}>
            Courbe de croissance {logScale ? "(log)" : ""}
          </h3>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-3">
            {series.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 text-xs rounded px-2 py-0.5"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
                {s.name} · {s.unit}
              </span>
            ))}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, overflowX: "auto" }}>
            <GrowthChart series={series} logScale={logScale} timeUnit={timeUnit} />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--fg-subtle)" }}>
            Temps de doublement (phase exponentielle)
          </h3>
          <div className="flex flex-wrap gap-3">
            {series.map((s) => {
              const pts = s.points
                .map((p) => ({ t: parseFloat(p.time), v: parseFloat(p.value) }))
                .filter((p) => !isNaN(p.t) && !isNaN(p.v) && p.v > 0);
              const dt = doublingTime(pts);
              const k = dt !== null ? Math.LN2 / (dt * Math.LOG2E) : null;
              return (
                <div key={s.id} className="rounded-lg px-4 py-3 flex flex-col gap-1"
                  style={{ background: "var(--surface)", border: `1.5px solid ${s.color}44`, minWidth: 150 }}>
                  <div className="flex items-center gap-2">
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--fg)" }}>{s.name}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: s.color }}>
                    {dt !== null ? `${dt.toFixed(2)} ${timeUnit}` : "—"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                    {k !== null ? `μ = ${k.toFixed(4)} ${timeUnit}⁻¹` : pts.length < 2 ? "Données insuffisantes" : "Phase non exponentielle"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs italic mt-3" style={{ color: "var(--fg-subtle)" }}>
            Régression linéaire sur log₂(valeur) vs temps. Pour plus de précision, utiliser uniquement les points en phase exponentielle.
          </p>
        </section>
      </div>
    </div>
  );
}
