import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadBlob, svgToImgTag } from "../../../utils/download";

function uid() { return Math.random().toString(36).slice(2, 8); }

interface Replicate { id: string; ctTarget: string; ctRef: string; }
interface Sample { id: string; name: string; isControl: boolean; replicates: Replicate[]; }

function emptyRep(): Replicate { return { id: uid(), ctTarget: "", ctRef: "" }; }
function emptySample(n: number, isControl = false): Sample {
  return { id: uid(), name: isControl ? "Contrôle" : `Sample ${n}`, isControl, replicates: [emptyRep()] };
}

function mean(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

interface Result {
  id: string;
  name: string;
  isControl: boolean;
  valid: boolean;
  meanDeltaCt: number;
  semDeltaCt: number;
  deltaDeltaCt: number;
  foldChange: number;
  errorFC: number;
}

function compute(samples: Sample[]): Result[] | null {
  const ctrl = samples.find((s) => s.isControl);
  if (!ctrl) return null;

  function getDeltaCts(s: Sample): number[] {
    return s.replicates
      .map((r) => [parseFloat(r.ctTarget), parseFloat(r.ctRef)] as [number, number])
      .filter(([t, r]) => !isNaN(t) && !isNaN(r))
      .map(([t, r]) => t - r);
  }

  const ctrlDCts = getDeltaCts(ctrl);
  if (ctrlDCts.length === 0) return null;
  const ctrlMean = mean(ctrlDCts);
  const ctrlSEM = ctrlDCts.length >= 2 ? stdDev(ctrlDCts) / Math.sqrt(ctrlDCts.length) : 0;

  return samples.map((s) => {
    const dcts = getDeltaCts(s);
    if (dcts.length === 0) {
      return { id: s.id, name: s.name, isControl: s.isControl, valid: false, meanDeltaCt: NaN, semDeltaCt: NaN, deltaDeltaCt: NaN, foldChange: NaN, errorFC: NaN };
    }
    const mdc = mean(dcts);
    const sem = dcts.length >= 2 ? stdDev(dcts) / Math.sqrt(dcts.length) : 0;
    const ddc = mdc - ctrlMean;
    const fc = Math.pow(2, -ddc);
    const semDDC = Math.sqrt(sem ** 2 + ctrlSEM ** 2);
    const errFC = fc * Math.LN2 * semDDC;
    return { id: s.id, name: s.name, isControl: s.isControl, valid: true, meanDeltaCt: mdc, semDeltaCt: sem, deltaDeltaCt: ddc, foldChange: fc, errorFC: errFC };
  });
}

// ── Chart ─────────────────────────────────────────────────────────────────────

const BAR_W = 52, GAP = 14, CHART_H = 200, PAD_L = 52, PAD_T = 16, LABEL_H = 48;

function QPCRChart({ results }: { results: Result[] }) {
  const valid = results.filter((r) => r.valid);
  if (valid.length === 0) return null;

  const maxFC = Math.max(...valid.map((r) => r.foldChange + Math.max(r.errorFC, 0)), 1.3) * 1.05;
  const svgW = PAD_L + GAP + valid.length * (BAR_W + GAP);
  const svgH = PAD_T + CHART_H + LABEL_H;

  const yOf = (v: number) => PAD_T + CHART_H - (v / maxFC) * CHART_H;
  const zeroY = yOf(0);
  const oneY = yOf(1);

  const TICKS = 5;
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => (maxFC * i) / TICKS);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={svgW} height={svgH} style={{ fontFamily: "var(--font-mono)", display: "block" }}>
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CHART_H} stroke="var(--border)" strokeWidth={1} />
        <line x1={PAD_L} y1={zeroY} x2={svgW} y2={zeroY} stroke="var(--border)" strokeWidth={1} />
        <line x1={PAD_L} y1={oneY} x2={svgW} y2={oneY} stroke="#6366f1" strokeWidth={1} strokeDasharray="5,3" opacity={0.5} />
        <text x={PAD_L - 5} y={oneY + 4} fontSize={9} fill="#6366f1" textAnchor="end" opacity={0.8}>1×</text>

        {ticks.map((v) => {
          const y = yOf(v);
          return (
            <g key={v}>
              <line x1={PAD_L - 3} y1={y} x2={PAD_L} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD_L - 6} y={y + 4} fontSize={9} fill="var(--fg-subtle)" textAnchor="end">
                {v.toFixed(v >= 10 ? 0 : 1)}
              </text>
            </g>
          );
        })}

        <text x={10} y={PAD_T + CHART_H / 2} fontSize={9} fill="var(--fg-subtle)" textAnchor="middle"
          transform={`rotate(-90, 10, ${PAD_T + CHART_H / 2})`}>
          Fold-change
        </text>

        {valid.map((r, i) => {
          const x = PAD_L + GAP + i * (BAR_W + GAP);
          const barTop = yOf(r.foldChange);
          const barH = Math.max(zeroY - barTop, 1);
          const color = r.isControl ? "#6b7280" : "#6366f1";
          const midX = x + BAR_W / 2;
          const errTop = r.errorFC > 0 ? yOf(r.foldChange + r.errorFC) : barTop;
          const errBot = r.errorFC > 0 ? yOf(Math.max(r.foldChange - r.errorFC, 0)) : zeroY;

          return (
            <g key={r.id}>
              <rect x={x} y={barTop} width={BAR_W} height={barH} fill={color} opacity={r.isControl ? 0.4 : 0.78} rx={2} />
              {r.errorFC > 0 && (
                <g stroke={color} strokeWidth={1.5} opacity={0.85}>
                  <line x1={midX} y1={errTop} x2={midX} y2={errBot} />
                  <line x1={midX - 5} y1={errTop} x2={midX + 5} y2={errTop} />
                  <line x1={midX - 5} y1={errBot} x2={midX + 5} y2={errBot} />
                </g>
              )}
              <text x={midX} y={errTop - 4} fontSize={9} fill="var(--fg-muted)" textAnchor="middle">
                {r.foldChange.toFixed(2)}×
              </text>
              <text x={midX} y={PAD_T + CHART_H + 14} fontSize={9} fill="var(--fg-subtle)" textAnchor="middle"
                fontStyle={r.isControl ? "italic" : "normal"}>
                {r.name.length > 9 ? r.name.slice(0, 8) + "…" : r.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── SVG string (for notebook export) ──────────────────────────────────────────

function buildQPCRSVGString(results: Result[], targetGene: string, refGene: string): string {
  const valid = results.filter((r) => r.valid);
  if (valid.length === 0) return "";
  const maxFC = Math.max(...valid.map((r) => r.foldChange + Math.max(r.errorFC, 0)), 1.3) * 1.05;
  const W = PAD_L + GAP + valid.length * (BAR_W + GAP) + GAP;
  const H = PAD_T + CHART_H + LABEL_H;
  const yOf = (v: number) => PAD_T + CHART_H - (v / maxFC) * CHART_H;
  const zeroY = yOf(0);
  const oneY = yOf(1);
  const ticks = Array.from({ length: 6 }, (_, i) => (maxFC * i) / 5);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const ticksSvg = ticks.map((v) => {
    const y = yOf(v);
    return `<line x1="${PAD_L - 3}" y1="${y.toFixed(1)}" x2="${PAD_L}" y2="${y.toFixed(1)}" stroke="#94a3b8" stroke-width="1"/>` +
      `<text x="${PAD_L - 6}" y="${(y + 4).toFixed(1)}" font-size="9" fill="#64748b" text-anchor="end">${v.toFixed(v >= 10 ? 0 : 1)}</text>`;
  }).join("");

  const barsSvg = valid.map((r, i) => {
    const x = PAD_L + GAP + i * (BAR_W + GAP);
    const barTop = yOf(r.foldChange);
    const barH = Math.max(zeroY - barTop, 1);
    const color = r.isControl ? "#6b7280" : "#6366f1";
    const midX = x + BAR_W / 2;
    const errTop = r.errorFC > 0 ? yOf(r.foldChange + r.errorFC) : barTop;
    const errBot = r.errorFC > 0 ? yOf(Math.max(r.foldChange - r.errorFC, 0)) : zeroY;
    const errSvg = r.errorFC > 0
      ? `<line x1="${midX}" y1="${errTop.toFixed(1)}" x2="${midX}" y2="${errBot.toFixed(1)}" stroke="${color}" stroke-width="1.5"/>` +
        `<line x1="${midX - 5}" y1="${errTop.toFixed(1)}" x2="${midX + 5}" y2="${errTop.toFixed(1)}" stroke="${color}" stroke-width="1.5"/>` +
        `<line x1="${midX - 5}" y1="${errBot.toFixed(1)}" x2="${midX + 5}" y2="${errBot.toFixed(1)}" stroke="${color}" stroke-width="1.5"/>`
      : "";
    const label = esc(r.name.length > 9 ? r.name.slice(0, 8) + "…" : r.name);
    return `<rect x="${x}" y="${barTop.toFixed(1)}" width="${BAR_W}" height="${barH.toFixed(1)}" fill="${color}" opacity="${r.isControl ? 0.4 : 0.78}" rx="2"/>` +
      errSvg +
      `<text x="${midX}" y="${(errTop - 4).toFixed(1)}" font-size="9" fill="#334155" text-anchor="middle">${r.foldChange.toFixed(2)}×</text>` +
      `<text x="${midX}" y="${(PAD_T + CHART_H + 14).toFixed(1)}" font-size="9" fill="#64748b" text-anchor="middle"${r.isControl ? ` font-style="italic"` : ""}>${label}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="monospace" style="background:#f8fafc">` +
    `<line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${PAD_T + CHART_H}" stroke="#cbd5e1" stroke-width="1"/>` +
    `<line x1="${PAD_L}" y1="${zeroY.toFixed(1)}" x2="${W}" y2="${zeroY.toFixed(1)}" stroke="#cbd5e1" stroke-width="1"/>` +
    `<line x1="${PAD_L}" y1="${oneY.toFixed(1)}" x2="${W}" y2="${oneY.toFixed(1)}" stroke="#6366f1" stroke-width="1" stroke-dasharray="5,3" opacity="0.6"/>` +
    `<text x="${PAD_L - 5}" y="${(oneY + 4).toFixed(1)}" font-size="9" fill="#6366f1" text-anchor="end" opacity="0.8">1×</text>` +
    `<text x="12" y="${(PAD_T + CHART_H / 2).toFixed(1)}" font-size="9" fill="#64748b" text-anchor="middle" transform="rotate(-90 12 ${(PAD_T + CHART_H / 2).toFixed(1)})">Fold-change</text>` +
    ticksSvg + barsSvg +
    `<text x="${W / 2}" y="${H - 4}" font-size="9" fill="#94a3b8" text-anchor="middle">${esc(targetGene ? `Fold-change — ${targetGene} / ${refGene}` : "qPCR ΔΔCt")}</text>` +
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

export default function QPCRPage() {
  const navigate = useNavigate();
  const [refGene, setRefGene] = useState("GAPDH");
  const [targetGene, setTargetGene] = useState("");
  const [samples, setSamples] = useState<Sample[]>([emptySample(1, true), emptySample(2)]);

  function addSample() { setSamples((ss) => [...ss, emptySample(ss.length + 1)]); }
  function removeSample(id: string) { setSamples((ss) => ss.filter((s) => s.id !== id)); }
  function updateSample(id: string, patch: Partial<Sample>) { setSamples((ss) => ss.map((s) => s.id === id ? { ...s, ...patch } : s)); }
  function setControl(id: string) { setSamples((ss) => ss.map((s) => ({ ...s, isControl: s.id === id }))); }
  function addRep(sid: string) { setSamples((ss) => ss.map((s) => s.id === sid ? { ...s, replicates: [...s.replicates, emptyRep()] } : s)); }
  function removeRep(sid: string, rid: string) { setSamples((ss) => ss.map((s) => s.id === sid ? { ...s, replicates: s.replicates.filter((r) => r.id !== rid) } : s)); }
  function updateRep(sid: string, rid: string, field: "ctTarget" | "ctRef", val: string) {
    setSamples((ss) => ss.map((s) => s.id === sid ? { ...s, replicates: s.replicates.map((r) => r.id === rid ? { ...r, [field]: val } : r) } : s));
  }

  const results = compute(samples);

  function exportCSV() {
    if (!results) return;
    const lines = ["sample,is_control,replicate,ct_target,ct_ref,delta_ct,delta_delta_ct,fold_change"];
    samples.forEach((s) => {
      const res = results.find((r) => r.id === s.id);
      s.replicates.forEach((rep, i) => {
        const t = parseFloat(rep.ctTarget), r = parseFloat(rep.ctRef);
        const dct = !isNaN(t) && !isNaN(r) ? (t - r).toFixed(4) : "";
        lines.push(`${s.name},${s.isControl},${i + 1},${rep.ctTarget},${rep.ctRef},${dct},${res?.valid ? res.deltaDeltaCt.toFixed(4) : ""},${res?.valid ? res.foldChange.toFixed(4) : ""}`);
      });
    });
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv" }), `qpcr_${targetGene || "results"}.csv`);
  }

  function sendToNotebook() {
    if (!results || !targetGene) return;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const svgStr = buildQPCRSVGString(results, targetGene, refGene);
    const tableRows = results.map((r) =>
      `<tr>` +
      `<td>${esc(r.name)}${r.isControl ? " <em>(ctrl)</em>" : ""}</td>` +
      `<td>${r.valid ? `${r.meanDeltaCt.toFixed(3)} ± ${r.semDeltaCt.toFixed(3)}` : "—"}</td>` +
      `<td>${r.valid ? r.deltaDeltaCt.toFixed(3) : "—"}</td>` +
      `<td><strong>${r.valid ? r.foldChange.toFixed(3) + "×" : "—"}</strong></td>` +
      `<td>${r.valid && r.errorFC > 0 ? `± ${r.errorFC.toFixed(3)}` : "—"}</td>` +
      `</tr>`
    ).join("");
    const tableHtml = `<table><thead><tr><th>Échantillon</th><th>ΔCt (moy ± SEM)</th><th>ΔΔCt</th><th>Fold-change</th><th>± erreur</th></tr></thead><tbody>${tableRows}</tbody></table>`;
    const title = `qPCR ΔΔCt — ${targetGene}/${refGene}`;
    const body_html =
      `<h3>${esc(title)}</h3>\n` +
      (svgStr ? svgToImgTag(svgStr, title) + "\n" : "") +
      tableHtml +
      `\n<p><em>Méthode ΔΔCt (Livak). Généré le ${new Date().toLocaleDateString("fr-FR")}</em></p>`;
    navigate("/notebook", { state: { fromTool: { title, body_html } } });
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* ── Left: sample editor ── */}
      <div className="flex flex-col overflow-y-auto shrink-0"
        style={{ width: 320, borderRight: "1px solid var(--border)", background: "var(--surface)", padding: 16, gap: 14 }}>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--fg-subtle)" }}>Gènes</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs shrink-0" style={{ color: "var(--fg-muted)", width: 70 }}>Référence</label>
              <input value={refGene} onChange={(e) => setRefGene(e.target.value)} style={{ ...inputSm, flex: 1 }} placeholder="ex: GAPDH" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs shrink-0" style={{ color: "var(--fg-muted)", width: 70 }}>Cible</label>
              <input value={targetGene} onChange={(e) => setTargetGene(e.target.value)} style={{ ...inputSm, flex: 1 }} placeholder="ex: TNF, BRCA1…" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-subtle)" }}>
              Échantillons ({samples.length})
            </p>
            <button onClick={addSample}
              style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 4, padding: "2px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              + Sample
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {samples.map((s) => (
              <div key={s.id}
                style={{ background: "var(--surface-2)", border: `1px solid ${s.isControl ? "color-mix(in oklab, var(--primary) 40%, transparent)" : "var(--border)"}`, borderRadius: 6, padding: 10 }}>
                <div className="flex items-center gap-1 mb-2">
                  <input type="text" value={s.name} onChange={(e) => updateSample(s.id, { name: e.target.value })}
                    style={{ ...inputSm, flex: 1 }} placeholder="Nom du sample" />
                  <button onClick={() => setControl(s.id)} title="Définir comme contrôle"
                    style={{ background: s.isControl ? "var(--primary)" : "var(--surface)", color: s.isControl ? "#fff" : "var(--fg-subtle)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 6px", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>
                    ctrl
                  </button>
                  {!s.isControl && (
                    <button onClick={() => removeSample(s.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: 13, flexShrink: 0 }}>✕</button>
                  )}
                </div>

                <div className="flex gap-1 mb-1">
                  <span className="text-xs text-center" style={{ flex: 1, color: "var(--fg-subtle)" }}>Ct {targetGene || "cible"}</span>
                  <span className="text-xs text-center" style={{ flex: 1, color: "var(--fg-subtle)" }}>Ct {refGene || "réf"}</span>
                  <span style={{ width: 20 }} />
                </div>

                {s.replicates.map((rep) => (
                  <div key={rep.id} className="flex gap-1 mb-1 items-center">
                    <input type="number" step="any" placeholder="Ct" value={rep.ctTarget}
                      onChange={(e) => updateRep(s.id, rep.id, "ctTarget", e.target.value)}
                      style={{ ...inputSm, flex: 1 }} />
                    <input type="number" step="any" placeholder="Ct" value={rep.ctRef}
                      onChange={(e) => updateRep(s.id, rep.id, "ctRef", e.target.value)}
                      style={{ ...inputSm, flex: 1 }} />
                    <button onClick={() => removeRep(s.id, rep.id)} disabled={s.replicates.length === 1}
                      style={{ background: "none", border: "none", cursor: s.replicates.length === 1 ? "default" : "pointer", color: "var(--fg-subtle)", fontSize: 11, width: 20, flexShrink: 0, opacity: s.replicates.length === 1 ? 0.3 : 1 }}>×</button>
                  </div>
                ))}
                <button onClick={() => addRep(s.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 11, padding: 0, marginTop: 2 }}>
                  + réplicat
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-auto">
          <button onClick={sendToNotebook} disabled={!results || !targetGene}
            style={{ padding: "7px 0", borderRadius: 4, fontSize: 12, background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, opacity: !results || !targetGene ? 0.4 : 1 }}>
            → Cahier de labo
          </button>
          <button onClick={exportCSV} disabled={!results}
            style={{ padding: "7px 0", borderRadius: 4, fontSize: 12, background: "var(--surface-2)", color: "var(--fg-muted)", border: "1px solid var(--border)", cursor: "pointer", opacity: !results ? 0.4 : 1 }}>
            ⬇ Exporter CSV
          </button>
        </div>
      </div>

      {/* ── Right: results ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6" style={{ background: "var(--bg)" }}>
        {!targetGene ? (
          <p className="text-xs italic" style={{ color: "var(--fg-subtle)" }}>
            Renseignez le gène cible et les valeurs de Ct pour voir les résultats.
          </p>
        ) : results ? (
          <>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--fg-subtle)" }}>
                Fold-change — {targetGene} / {refGene}
              </h3>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                <QPCRChart results={results} />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--fg-subtle)" }}>
                Résultats détaillés
              </h3>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                      {["Échantillon", "ΔCt (moy ± SEM)", "ΔΔCt", "Fold-change", "± erreur"].map((h) => (
                        <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontWeight: 600, color: "var(--fg-subtle)", fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--border)", background: r.isControl ? "color-mix(in oklab, var(--primary) 5%, transparent)" : "transparent" }}>
                        <td style={{ padding: "6px 12px", color: "var(--fg)", fontWeight: r.isControl ? 600 : 400 }}>
                          {r.name}{r.isControl ? " (ctrl)" : ""}
                        </td>
                        <td style={{ padding: "6px 12px", fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>
                          {r.valid ? `${r.meanDeltaCt.toFixed(3)} ± ${r.semDeltaCt.toFixed(3)}` : "—"}
                        </td>
                        <td style={{ padding: "6px 12px", fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>
                          {r.valid ? r.deltaDeltaCt.toFixed(3) : "—"}
                        </td>
                        <td style={{ padding: "6px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: r.isControl ? "var(--fg-subtle)" : "var(--primary)" }}>
                          {r.valid ? r.foldChange.toFixed(3) + "×" : "—"}
                        </td>
                        <td style={{ padding: "6px 12px", fontFamily: "var(--font-mono)", color: "var(--fg-subtle)" }}>
                          {r.valid && r.errorFC > 0 ? `± ${r.errorFC.toFixed(3)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="text-xs italic" style={{ color: "var(--fg-subtle)" }}>
              Méthode ΔΔCt (Livak). Fold-change = 2^(−ΔΔCt). Erreur = SEM propagée (loi de propagation d'erreur).
              {samples.some((s) => s.isControl && s.replicates.length < 2) &&
                " Ajouter ≥ 2 réplicats techniques pour le calcul d'erreur."}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
