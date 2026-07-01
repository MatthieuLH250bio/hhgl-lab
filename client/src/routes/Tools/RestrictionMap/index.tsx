import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listResource } from "../../../api/database";

// ── Enzyme database ───────────────────────────────────────────────────────────

interface EnzymeDef { name: string; seq: string; cut: number; }

const ENZYMES: EnzymeDef[] = [
  { name: "EcoRI",   seq: "GAATTC",   cut: 1 },
  { name: "BamHI",   seq: "GGATCC",   cut: 1 },
  { name: "HindIII", seq: "AAGCTT",   cut: 1 },
  { name: "XhoI",    seq: "CTCGAG",   cut: 1 },
  { name: "XbaI",    seq: "TCTAGA",   cut: 1 },
  { name: "SalI",    seq: "GTCGAC",   cut: 1 },
  { name: "NcoI",    seq: "CCATGG",   cut: 1 },
  { name: "NheI",    seq: "GCTAGC",   cut: 1 },
  { name: "SpeI",    seq: "ACTAGT",   cut: 1 },
  { name: "BglII",   seq: "AGATCT",   cut: 1 },
  { name: "AgeI",    seq: "ACCGGT",   cut: 1 },
  { name: "MluI",    seq: "ACGCGT",   cut: 1 },
  { name: "StuI",    seq: "AGGCCT",   cut: 3 },
  { name: "ScaI",    seq: "AGTACT",   cut: 3 },
  { name: "EcoRV",   seq: "GATATC",   cut: 3 },
  { name: "ClaI",    seq: "ATCGAT",   cut: 2 },
  { name: "KpnI",    seq: "GGTACC",   cut: 5 },
  { name: "SacI",    seq: "GAGCTC",   cut: 5 },
  { name: "SmaI",    seq: "CCCGGG",   cut: 3 },
  { name: "PstI",    seq: "CTGCAG",   cut: 5 },
  { name: "SphI",    seq: "GCATGC",   cut: 5 },
  { name: "NotI",    seq: "GCGGCCGC", cut: 2 },
  { name: "AscI",    seq: "GGCGCGCC", cut: 2 },
  { name: "PacI",    seq: "TTAATTAA", cut: 5 },
  { name: "FseI",    seq: "GGCCGGCC", cut: 6 },
  { name: "SwaI",    seq: "ATTTAAAT", cut: 4 },
];

const DEFAULT_SELECTED = new Set([
  "EcoRI", "BamHI", "HindIII", "XhoI", "XbaI", "SalI", "NcoI", "NheI", "NotI", "KpnI", "SacI",
]);

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#6366f1", "#a855f7", "#ec4899", "#14b8a6", "#64748b",
  "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2",
  "#4f46e5", "#7c3aed", "#db2777", "#0f766e", "#1d4ed8",
  "#b45309", "#15803d", "#1e40af", "#9333ea", "#be185d", "#0e7490",
];

// ── IUPAC helpers ─────────────────────────────────────────────────────────────

const IUPAC: Record<string, string> = {
  A: "A", C: "C", G: "G", T: "T", U: "T",
  N: "[ACGT]", R: "[AG]", Y: "[CT]", S: "[GC]", W: "[AT]",
  K: "[GT]", M: "[AC]", B: "[CGT]", D: "[AGT]", H: "[ACT]", V: "[ACG]",
};
const COMP: Record<string, string> = {
  A: "T", T: "A", G: "C", C: "G", U: "A",
  N: "N", R: "Y", Y: "R", S: "S", W: "W", K: "M", M: "K",
  B: "V", V: "B", D: "H", H: "D",
};

function seqToRegex(s: string): RegExp {
  return new RegExp(s.toUpperCase().split("").map((c) => IUPAC[c] ?? c).join(""), "g");
}
function revComp(seq: string): string {
  return seq.toUpperCase().split("").reverse().map((c) => COMP[c] ?? c).join("");
}
function cleanSeq(raw: string): string {
  return raw.toUpperCase().replace(/[^ACGTUNRYWSKMBDHV]/g, "");
}

// ── Cut-site finding ──────────────────────────────────────────────────────────

interface CutSite { pos: number; enzyme: string; color: string; }

function findCutSites(seq: string, enzymes: EnzymeDef[], colors: Record<string, string>): CutSite[] {
  const sites: CutSite[] = [];
  const seen = new Set<string>();

  for (const ez of enzymes) {
    const color = colors[ez.name] ?? "#6b7280";
    const add = (pos: number) => {
      const key = `${ez.name}:${pos}`;
      if (!seen.has(key) && pos >= 0 && pos <= seq.length) {
        seen.add(key);
        sites.push({ pos, enzyme: ez.name, color });
      }
    };

    let m: RegExpExecArray | null;
    const fwd = seqToRegex(ez.seq);
    while ((m = fwd.exec(seq)) !== null) {
      add(m.index + ez.cut);
      if (m[0].length === 0) fwd.lastIndex++;
    }

    const rc = revComp(ez.seq);
    if (rc !== ez.seq) {
      const rev = seqToRegex(rc);
      while ((m = rev.exec(seq)) !== null) {
        add(m.index + ez.seq.length - ez.cut);
        if (m[0].length === 0) rev.lastIndex++;
      }
    }
  }

  return sites.sort((a, b) => a.pos - b.pos);
}

// ── Fragment calculation ──────────────────────────────────────────────────────

interface Fragment { size: number; start: number; end: number; labels: string[]; }

function calcFragments(seqLen: number, sites: CutSite[], circular: boolean): Fragment[] {
  const enzymeAtPos = new Map<number, Set<string>>();
  for (const s of sites) {
    if (!enzymeAtPos.has(s.pos)) enzymeAtPos.set(s.pos, new Set());
    enzymeAtPos.get(s.pos)!.add(s.enzyme);
  }
  const positions = [...new Set(sites.map((s) => s.pos))].sort((a, b) => a - b);

  if (positions.length === 0) return [{ size: seqLen, start: 0, end: seqLen, labels: [] }];

  const frags: Fragment[] = [];
  if (circular) {
    for (let i = 0; i < positions.length; i++) {
      const start = positions[i];
      const end = positions[(i + 1) % positions.length];
      const size = end > start ? end - start : seqLen - start + end;
      frags.push({ size, start, end, labels: [...(enzymeAtPos.get(start) ?? [])] });
    }
  } else {
    const pts = [0, ...positions, seqLen];
    for (let i = 0; i < pts.length - 1; i++) {
      const startEnz = [...(enzymeAtPos.get(pts[i]) ?? [])];
      const endEnz   = [...(enzymeAtPos.get(pts[i + 1]) ?? [])];
      frags.push({ size: pts[i + 1] - pts[i], start: pts[i], end: pts[i + 1], labels: [...new Set([...startEnz, ...endEnz])] });
    }
  }

  return frags.sort((a, b) => b.size - a.size);
}

// ── Linear map SVG ────────────────────────────────────────────────────────────

const BAR_Y = 100, BAR_H = 14;
const MAP_PAD = 24, MAP_H = 180, MAP_W = 600;

function LinearMap({ seqLen, sites }: { seqLen: number; sites: CutSite[] }) {
  if (seqLen === 0) return null;
  const availW = MAP_W - MAP_PAD * 2;
  const xOf = (pos: number) => MAP_PAD + (pos / seqLen) * availW;

  // Assign label height levels greedily to avoid overlap
  const positions = [...new Set(sites.map((s) => s.pos))].sort((a, b) => a - b);
  const LEVELS = 4;
  const lastX = Array(LEVELS).fill(-Infinity);
  const posLevel = new Map<number, number>();
  for (const pos of positions) {
    const x = xOf(pos);
    let best = 0, bestGap = -Infinity;
    for (let l = 0; l < LEVELS; l++) {
      if (x - lastX[l] > bestGap) { bestGap = x - lastX[l]; best = l; }
    }
    posLevel.set(pos, best);
    lastX[best] = x;
  }
  const LEVEL_Y = [BAR_Y - 62, BAR_Y - 48, BAR_Y - 34, BAR_Y - 20];

  const posColor = new Map<number, string>();
  const posEnzymes = new Map<number, string[]>();
  for (const s of sites) {
    if (!posColor.has(s.pos)) posColor.set(s.pos, s.color);
    if (!posEnzymes.has(s.pos)) posEnzymes.set(s.pos, []);
    if (!posEnzymes.get(s.pos)!.includes(s.enzyme)) posEnzymes.get(s.pos)!.push(s.enzyme);
  }

  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", fontFamily: "var(--font-mono)", display: "block" }}>
      {/* Sequence bar */}
      <rect x={MAP_PAD} y={BAR_Y} width={availW} height={BAR_H} fill="#1e293b" rx={3} />

      {/* Scale labels */}
      <text x={MAP_PAD} y={BAR_Y + BAR_H + 14} fontSize={9} fill="var(--fg-subtle)" textAnchor="middle">0</text>
      {[0.25, 0.5, 0.75].map((f) => (
        <g key={f}>
          <line x1={MAP_PAD + availW * f} y1={BAR_Y + BAR_H} x2={MAP_PAD + availW * f} y2={BAR_Y + BAR_H + 5} stroke="var(--border)" strokeWidth={1} />
          <text x={MAP_PAD + availW * f} y={BAR_Y + BAR_H + 14} fontSize={9} fill="var(--fg-subtle)" textAnchor="middle">
            {Math.round(seqLen * f).toLocaleString()}
          </text>
        </g>
      ))}
      <text x={MAP_PAD + availW} y={BAR_Y + BAR_H + 14} fontSize={9} fill="var(--fg-subtle)" textAnchor="middle">
        {seqLen >= 1000 ? `${(seqLen / 1000).toFixed(1)} kb` : `${seqLen} bp`}
      </text>

      {/* Cut sites */}
      {positions.map((pos) => {
        const x = xOf(pos);
        const level = posLevel.get(pos) ?? 0;
        const color = posColor.get(pos) ?? "#6b7280";
        const enzymes = posEnzymes.get(pos) ?? [];
        const labelY = LEVEL_Y[level];
        const label = enzymes.join("/");

        return (
          <g key={pos}>
            <line x1={x} y1={labelY + 14} x2={x} y2={BAR_Y + BAR_H + 2} stroke={color} strokeWidth={1.5} opacity={0.9} />
            <rect x={x - (label.length * 4.5) / 2 - 2} y={labelY - 2} width={label.length * 4.5 + 4} height={10} fill="var(--surface)" opacity={0.7} />
            <text x={x} y={labelY + 7} fontSize={8} fill={color} textAnchor="middle" fontWeight={700}>
              {label.length > 14 ? label.slice(0, 13) + "…" : label}
            </text>
            <text x={x} y={labelY + 17} fontSize={7} fill={color} textAnchor="middle" opacity={0.6}>
              {pos.toLocaleString()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Gel preview ───────────────────────────────────────────────────────────────

const GL_TOP = 30, GL_BOT = 270, GL_H = 310, LW = 68, WW = 48, WH = 14, GP = 10;
const LADDER_1KB = [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1500, 1000, 750, 500, 250];

function gelMigrate(sizes: number[], allSizes: number[]): number[] {
  const valid = allSizes.filter((s) => s > 0);
  if (valid.length < 2) return sizes.map(() => (GL_TOP + GL_BOT) / 2);
  const minS = Math.log(Math.min(...valid));
  const maxS = Math.log(Math.max(...valid));
  const range = maxS - minS;
  if (range === 0) return sizes.map(() => (GL_TOP + GL_BOT) / 2);
  return sizes.map((s) => s <= 0 ? GL_BOT : GL_BOT - ((Math.log(s) - minS) / range) * (GL_BOT - GL_TOP));
}

function GelPreview({ fragments, label }: { fragments: Fragment[]; label: string }) {
  const fragSizes = fragments.map((f) => f.size).filter((s) => s > 0);
  if (fragSizes.length === 0) return null;

  const allSizes = [...LADDER_1KB, ...fragSizes];
  const svgW = GP * 2 + LW * 2;
  const svgH = GL_H + 22;
  const laddCX = GP + LW / 2;
  const fragCX = GP + LW + LW / 2;
  const laddYs = gelMigrate(LADDER_1KB, allSizes);
  const fragYs = gelMigrate(fragSizes, allSizes);

  return (
    <svg width={svgW} height={svgH} style={{ fontFamily: "var(--font-mono)", display: "block" }}>
      <defs>
        <radialGradient id="rg-b-rm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#00ff88" stopOpacity="0.1" />
        </radialGradient>
        <radialGradient id="rg-l-rm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#88ccff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#88ccff" stopOpacity="0.1" />
        </radialGradient>
        <filter id="gw-rm">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect x={0} y={0} width={svgW} height={GL_H} fill="#0d1117" rx={4} />
      <rect x={GP} y={GL_TOP} width={svgW - GP * 2} height={GL_BOT - GL_TOP} fill="#121820" />
      {[laddCX, fragCX].map((cx) => (
        <rect key={cx} x={cx - WW / 2} y={GL_TOP - WH} width={WW} height={WH} fill="#0d1117" rx={2} />
      ))}

      {LADDER_1KB.map((size, i) => (
        <g key={size} filter="url(#gw-rm)">
          <rect x={laddCX - WW / 2} y={laddYs[i] - 2} width={WW} height={5} fill="url(#rg-l-rm)" rx={1} />
          <text x={laddCX + WW / 2 + 3} y={laddYs[i] + 4} fontSize={8} fill="#88ccff" opacity={0.7}>
            {size >= 1000 ? `${size / 1000}k` : size}
          </text>
        </g>
      ))}

      {fragSizes.map((size, i) => (
        <g key={`${size}-${i}`} filter="url(#gw-rm)">
          <rect x={fragCX - WW / 2} y={fragYs[i] - 3} width={WW} height={7} fill="url(#rg-b-rm)" rx={1} />
        </g>
      ))}

      <text x={laddCX} y={GL_H + 15} fontSize={9} fill="#88ccff" textAnchor="middle" opacity={0.7}>M</text>
      <text x={fragCX} y={GL_H + 15} fontSize={9} fill="#6b7280" textAnchor="middle">
        {label.length > 10 ? label.slice(0, 9) + "…" : label}
      </text>
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const inputSm = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--fg)",
  borderRadius: 4,
  fontSize: 11,
  padding: "4px 8px",
  outline: "none",
} as const;

export default function RestrictionMapPage() {
  const [sequence, setSequence] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SELECTED));
  const [circular, setCircular] = useState(true);
  const [filter, setFilter] = useState("");
  const [plasmidId, setPlasmidId] = useState("");

  const plasmidsQuery = useQuery({
    queryKey: ["db", "plasmids", ""],
    queryFn: () => listResource("plasmids", { limit: "200" }),
    staleTime: 60_000,
  });
  const plasmids = (plasmidsQuery.data ?? []) as { id: string; code: string; name: string; sequence?: string | null }[];

  function loadPlasmid(id: string) {
    const p = plasmids.find((pl) => pl.id === id);
    if (p?.sequence) { setSequence(p.sequence); setPlasmidId(id); }
  }

  const seq = useMemo(() => cleanSeq(sequence), [sequence]);

  const enzymeColors = useMemo(() => {
    const m: Record<string, string> = {};
    ENZYMES.forEach((ez, i) => { m[ez.name] = PALETTE[i % PALETTE.length]; });
    return m;
  }, []);

  const selectedEnzymes = useMemo(() => ENZYMES.filter((ez) => selected.has(ez.name)), [selected]);

  const sites = useMemo(
    () => (seq.length > 0 ? findCutSites(seq, selectedEnzymes, enzymeColors) : []),
    [seq, selectedEnzymes, enzymeColors]
  );

  const fragments = useMemo(() => calcFragments(seq.length, sites, circular), [seq, sites, circular]);

  const filteredEnzymes = ENZYMES.filter((ez) => ez.name.toLowerCase().includes(filter.toLowerCase()));

  const gelLabel = [...selected].slice(0, 2).join("+") + (selected.size > 2 ? `+${selected.size - 2}` : "");

  function toggleEnzyme(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function toggleAll() {
    const allFiltered = new Set(filteredEnzymes.map((e) => e.name));
    const allSelected = filteredEnzymes.every((e) => selected.has(e.name));
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); allFiltered.forEach((n) => next.delete(n)); return next; });
    } else {
      setSelected((prev) => new Set([...prev, ...allFiltered]));
    }
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* ── Left: controls ── */}
      <div className="flex flex-col overflow-y-auto shrink-0"
        style={{ width: 280, borderRight: "1px solid var(--border)", background: "var(--surface)", padding: 16, gap: 14 }}>

        {/* Sequence */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--fg-subtle)" }}>Séquence</p>
          {plasmids.some((p) => p.sequence) && (
            <select value={plasmidId} onChange={(e) => loadPlasmid(e.target.value)}
              style={{ ...inputSm, width: "100%", marginBottom: 6 }}>
              <option value="">— Depuis la DB —</option>
              {plasmids.filter((p) => p.sequence).map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          )}
          <textarea
            value={sequence}
            onChange={(e) => { setSequence(e.target.value); setPlasmidId(""); }}
            rows={5}
            placeholder="ATGCGTACG… (FASTA ou brut)"
            spellCheck={false}
            style={{ ...inputSm, width: "100%", resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 10, lineHeight: 1.5, letterSpacing: "0.04em" }}
          />
          {seq.length > 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--fg-subtle)" }}>
              {seq.length.toLocaleString()} bp · {sites.length} site{sites.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Topology */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--fg-subtle)" }}>Topologie</p>
          <div className="flex gap-1">
            {(["Circulaire", "Linéaire"] as const).map((t) => {
              const isCirc = t === "Circulaire";
              const active = circular === isCirc;
              return (
                <button key={t} onClick={() => setCircular(isCirc)}
                  style={{ flex: 1, padding: "4px 0", borderRadius: 4, fontSize: 11, background: active ? "var(--primary)" : "var(--surface-2)", color: active ? "#fff" : "var(--fg-muted)", border: "1px solid var(--border)", cursor: "pointer", fontWeight: active ? 600 : 400 }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Enzyme picker */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-subtle)" }}>
              Enzymes ({selected.size}/{ENZYMES.length})
            </p>
            <button onClick={toggleAll}
              style={{ fontSize: 10, background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: 0 }}>
              {filteredEnzymes.every((e) => selected.has(e.name)) ? "Aucune" : "Toutes"}
            </button>
          </div>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrer…"
            style={{ ...inputSm, width: "100%" }} />

          <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
            {filteredEnzymes.map((ez) => {
              const isSelected = selected.has(ez.name);
              const color = enzymeColors[ez.name];
              const count = sites.filter((s) => s.enzyme === ez.name).length;
              return (
                <label key={ez.name}
                  className="flex items-center gap-2 cursor-pointer px-1 py-0.5 rounded"
                  style={{ fontSize: 12, background: isSelected && seq.length > 0 ? `${color}10` : "transparent" }}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleEnzyme(ez.name)}
                    style={{ accentColor: color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: isSelected ? 600 : 400, color: isSelected ? color : "var(--fg-muted)", flex: 1 }}>
                    {ez.name}
                  </span>
                  <span className="text-xs" style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-mono)" }}>
                    {ez.seq.length}bp
                  </span>
                  {seq.length > 0 && isSelected && (
                    <span className="rounded px-1 text-xs"
                      style={{ background: count > 0 ? `${color}25` : "transparent", color: count > 0 ? color : "var(--fg-subtle)", fontWeight: 700, minWidth: 16, textAlign: "center" }}>
                      {count > 0 ? count : "—"}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: results ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6" style={{ background: "var(--bg)" }}>
        {seq.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--fg-subtle)" }}>
            <span style={{ fontSize: 40 }}>✂</span>
            <p className="text-sm">Collez une séquence ADN ou sélectionnez un plasmide.</p>
            <p className="text-xs italic">Format FASTA ou séquence brute acceptés.</p>
          </div>
        ) : (
          <>
            {/* Linear map */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--fg-subtle)" }}>
                Carte linéaire · {seq.length.toLocaleString()} bp · {circular ? "circulaire" : "linéaire"}
              </h3>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
                {sites.length === 0 ? (
                  <p className="text-xs italic" style={{ color: "var(--fg-subtle)" }}>
                    Aucun site de restriction trouvé pour les enzymes sélectionnées.
                  </p>
                ) : (
                  <LinearMap seqLen={seq.length} sites={sites} />
                )}
              </div>
            </section>

            {/* Gel + fragment table */}
            {sites.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--fg-subtle)" }}>
                  Fragments ({fragments.length})
                </h3>
                <div className="flex gap-4 items-start flex-wrap">
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, flexShrink: 0 }}>
                    <GelPreview fragments={fragments} label={gelLabel} />
                  </div>

                  <div className="flex-1 min-w-0" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                          {["#", "Taille", "Enzymes (coupures)", "Position"].map((h) => (
                            <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontWeight: 600, color: "var(--fg-subtle)", fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fragments.map((f, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "5px 12px", color: "var(--fg-subtle)", fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                            <td style={{ padding: "5px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--fg)", whiteSpace: "nowrap" }}>
                              {f.size.toLocaleString("fr-FR")} bp
                              {f.size >= 1000 && (
                                <span className="ml-1" style={{ fontWeight: 400, color: "var(--fg-subtle)", fontSize: 10 }}>
                                  ({(f.size / 1000).toFixed(2)} kb)
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "5px 12px" }}>
                              <div className="flex flex-wrap gap-1">
                                {[...new Set(f.labels)].map((ez) => (
                                  <span key={ez} className="rounded px-1.5 py-0.5 text-xs"
                                    style={{ background: `${enzymeColors[ez]}22`, color: enzymeColors[ez], fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                    {ez}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: "5px 12px", fontFamily: "var(--font-mono)", color: "var(--fg-subtle)", fontSize: 11, whiteSpace: "nowrap" }}>
                              {f.start.toLocaleString()}–{f.end.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* Site summary chips */}
            {sites.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--fg-subtle)" }}>
                  Sites de coupure
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ENZYMES.filter((ez) => sites.some((s) => s.enzyme === ez.name)).map((ez) => {
                    const ezSites = sites.filter((s) => s.enzyme === ez.name);
                    const color = enzymeColors[ez.name];
                    return (
                      <div key={ez.name} className="flex items-center gap-2 rounded-lg px-3 py-1.5 flex-wrap"
                        style={{ background: `${color}12`, border: `1px solid ${color}40` }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color, fontSize: 12 }}>{ez.name}</span>
                        <span className="text-xs" style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-mono)" }}>{ez.seq}</span>
                        <span className="rounded px-1.5 py-0.5 text-xs" style={{ background: `${color}28`, color, fontWeight: 700 }}>
                          ×{ezSites.length}
                        </span>
                        <span className="text-xs" style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-mono)" }}>
                          {ezSites.map((s) => s.pos.toLocaleString()).join(", ")}
                        </span>
                      </div>
                    );
                  })}
                  {selected.size > 0 && ENZYMES.filter((ez) => selected.has(ez.name) && !sites.some((s) => s.enzyme === ez.name)).length > 0 && (
                    <div className="text-xs italic" style={{ color: "var(--fg-subtle)", alignSelf: "center" }}>
                      Pas de site : {ENZYMES.filter((ez) => selected.has(ez.name) && !sites.some((s) => s.enzyme === ez.name)).map((e) => e.name).join(", ")}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
