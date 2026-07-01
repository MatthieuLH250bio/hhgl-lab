import { useRef, useState } from "react";

// ── Ladders ───────────────────────────────────────────────────────────────────

const LADDERS: Record<string, number[]> = {
  "1 kb":          [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1500, 1000, 750, 500, 250],
  "100 bp":        [1500, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100],
  "GeneRuler 1kb+": [10000, 7000, 5000, 3000, 2000, 1500, 1000, 700, 500, 400, 300, 200, 100],
  "λ/HindIII":     [23130, 9416, 6557, 4361, 2322, 2027, 564, 125],
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Band {
  id: string;
  size: string;  // bp as string for controlled input
  label: string;
}

interface Lane {
  id: string;
  name: string;
  bands: Band[];
}

// ── Gel geometry ──────────────────────────────────────────────────────────────

const GEL_H = 480;
const GEL_TOP = 50;    // y where wells end / migration starts
const GEL_BOT = 460;   // y of gel bottom
const LANE_W = 72;
const WELL_W = 50;
const WELL_H = 16;
const PADDING_L = 16;

function migrateY(sizesBp: number[], allSizes: number[]): number[] {
  const minS = Math.log(Math.min(...allSizes));
  const maxS = Math.log(Math.max(...allSizes));
  const range = maxS - minS;
  if (range === 0) return sizesBp.map(() => (GEL_TOP + GEL_BOT) / 2);
  return sizesBp.map((s) => {
    const frac = (Math.log(s) - minS) / range;
    // smaller = lower on gel (higher y)
    return GEL_BOT - frac * (GEL_BOT - GEL_TOP);
  });
}

// ── SVG Gel ───────────────────────────────────────────────────────────────────

function GelSVG({ lanes, ladderKey, showSizes }: {
  lanes: Lane[];
  ladderKey: string;
  showSizes: boolean;
}) {
  const ladder = LADDERS[ladderKey];
  const totalLanes = 1 + lanes.length; // ladder + sample lanes
  const svgW = PADDING_L * 2 + totalLanes * LANE_W;
  const svgH = GEL_H + 30; // extra for lane labels below

  // Collect all sizes for migration scale
  const allSizes: number[] = [...ladder];
  lanes.forEach((l) => l.bands.forEach((b) => { const n = parseFloat(b.size); if (n > 0) allSizes.push(n); }));
  if (allSizes.length < 2) allSizes.push(100, 10000);

  const ladderYs = migrateY(ladder, allSizes);

  return (
    <svg
      width={svgW}
      height={svgH}
      style={{ display: "block", maxWidth: "100%", fontFamily: "var(--font-mono)" }}
    >
      <defs>
        <radialGradient id="band-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#00ff88" stopOpacity="0.15" />
        </radialGradient>
        <radialGradient id="ladder-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#88ccff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#88ccff" stopOpacity="0.15" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Gel background */}
      <rect x={0} y={0} width={svgW} height={GEL_H} fill="#0d1117" rx={6} />
      <rect x={PADDING_L} y={GEL_TOP} width={svgW - PADDING_L * 2} height={GEL_BOT - GEL_TOP} fill="#121820" />

      {/* Lane wells */}
      {Array.from({ length: totalLanes }, (_, i) => {
        const cx = PADDING_L + i * LANE_W + LANE_W / 2;
        return (
          <rect
            key={i}
            x={cx - WELL_W / 2}
            y={GEL_TOP - WELL_H}
            width={WELL_W}
            height={WELL_H}
            fill="#0d1117"
            rx={2}
          />
        );
      })}

      {/* ── Ladder lane (index 0) ── */}
      {ladder.map((size, i) => {
        const y = ladderYs[i];
        const cx = PADDING_L + LANE_W / 2;
        return (
          <g key={size} filter="url(#glow)">
            <rect x={cx - WELL_W / 2} y={y - 3} width={WELL_W} height={6} fill="url(#ladder-glow)" rx={1} />
            {showSizes && (
              <text
                x={cx + WELL_W / 2 + 4}
                y={y + 4}
                fontSize={9}
                fill="#88ccff"
                opacity={0.8}
              >
                {size >= 1000 ? `${size / 1000}k` : size}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Sample lanes ── */}
      {lanes.map((lane, li) => {
        const laneIndex = li + 1;
        const cx = PADDING_L + laneIndex * LANE_W + LANE_W / 2;
        const validBands = lane.bands
          .map((b) => ({ ...b, sizeN: parseFloat(b.size) }))
          .filter((b) => b.sizeN > 0);
        const ys = validBands.length > 0
          ? migrateY(validBands.map((b) => b.sizeN), allSizes)
          : [];

        return (
          <g key={lane.id}>
            {validBands.map((band, bi) => (
              <g key={band.id} filter="url(#glow)">
                <rect
                  x={cx - WELL_W / 2}
                  y={ys[bi] - 4}
                  width={WELL_W}
                  height={8}
                  fill="url(#band-glow)"
                  rx={1}
                />
                {band.label && (
                  <text x={cx + WELL_W / 2 + 4} y={ys[bi] + 4} fontSize={8} fill="#00ff88" opacity={0.7}>
                    {band.label}
                  </text>
                )}
              </g>
            ))}
            {/* Lane label at bottom */}
            <text
              x={cx}
              y={GEL_H + 18}
              fontSize={10}
              fill="#6b7280"
              textAnchor="middle"
            >
              {lane.name || `L${laneIndex}`}
            </text>
          </g>
        );
      })}

      {/* Ladder label */}
      <text x={PADDING_L + LANE_W / 2} y={GEL_H + 18} fontSize={10} fill="#88ccff" textAnchor="middle" opacity={0.7}>
        M
      </text>
    </svg>
  );
}

// ── Controls ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 8); }

function emptyBand(): Band { return { id: uid(), size: "", label: "" }; }
function emptyLane(n: number): Lane { return { id: uid(), name: `Lane ${n}`, bands: [emptyBand()] }; }

const inputSm = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--fg)",
  borderRadius: 4,
  fontSize: 11,
  padding: "3px 7px",
  outline: "none",
} as const;

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GelSimulatorPage() {
  const [ladderKey, setLadderKey] = useState<string>("1 kb");
  const [showSizes, setShowSizes] = useState(true);
  const [lanes, setLanes] = useState<Lane[]>([emptyLane(1), emptyLane(2)]);
  const gelContainerRef = useRef<HTMLDivElement>(null);

  function addLane() {
    setLanes((ls) => [...ls, emptyLane(ls.length + 1)]);
  }

  function removeLane(id: string) {
    setLanes((ls) => ls.filter((l) => l.id !== id));
  }

  function updateLaneName(id: string, name: string) {
    setLanes((ls) => ls.map((l) => l.id === id ? { ...l, name } : l));
  }

  function addBand(laneId: string) {
    setLanes((ls) => ls.map((l) => l.id === laneId ? { ...l, bands: [...l.bands, emptyBand()] } : l));
  }

  function removeBand(laneId: string, bandId: string) {
    setLanes((ls) => ls.map((l) => l.id === laneId ? { ...l, bands: l.bands.filter((b) => b.id !== bandId) } : l));
  }

  function updateBand(laneId: string, bandId: string, field: keyof Band, value: string) {
    setLanes((ls) => ls.map((l) =>
      l.id === laneId
        ? { ...l, bands: l.bands.map((b) => b.id === bandId ? { ...b, [field]: value } : b) }
        : l
    ));
  }

  function downloadSVG() {
    const svg = gelContainerRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gel.svg";
    a.click();
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* ── Left panel: controls ── */}
      <div
        className="flex flex-col overflow-y-auto shrink-0"
        style={{ width: 280, borderRight: "1px solid var(--border)", background: "var(--surface)", padding: 16, gap: 16 }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--fg-subtle)" }}>
            Configuration
          </p>

          {/* Ladder */}
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs" style={{ color: "var(--fg-muted)" }}>Marqueur</label>
            <select
              value={ladderKey}
              onChange={(e) => setLadderKey(e.target.value)}
              style={{ ...inputSm, width: "100%" }}
            >
              {Object.keys(LADDERS).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Show sizes */}
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--fg-muted)" }}>
            <input
              type="checkbox"
              checked={showSizes}
              onChange={(e) => setShowSizes(e.target.checked)}
              style={{ accentColor: "var(--primary)" }}
            />
            Afficher les tailles
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-subtle)" }}>
              Puits ({lanes.length})
            </p>
            <button
              onClick={addLane}
              disabled={lanes.length >= 10}
              className="rounded px-2 py-0.5 text-xs font-semibold"
              style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: lanes.length >= 10 ? "default" : "pointer", opacity: lanes.length >= 10 ? 0.5 : 1 }}
            >
              + Puits
            </button>
          </div>

          {lanes.map((lane, li) => (
            <div
              key={lane.id}
              className="flex flex-col gap-1.5 rounded-lg p-2"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              {/* Lane header */}
              <div className="flex items-center gap-1">
                <span className="text-xs shrink-0" style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-mono)", minWidth: 16 }}>
                  {li + 1}
                </span>
                <input
                  type="text"
                  value={lane.name}
                  onChange={(e) => updateLaneName(lane.id, e.target.value)}
                  style={{ ...inputSm, flex: 1 }}
                  placeholder="Nom du puits"
                />
                <button
                  onClick={() => removeLane(lane.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: 13, flexShrink: 0 }}
                  title="Supprimer ce puits"
                >
                  ✕
                </button>
              </div>

              {/* Bands */}
              {lane.bands.map((band) => (
                <div key={band.id} className="flex items-center gap-1">
                  <input
                    type="number"
                    min={10}
                    value={band.size}
                    onChange={(e) => updateBand(lane.id, band.id, "size", e.target.value)}
                    placeholder="bp"
                    style={{ ...inputSm, width: 70 }}
                  />
                  <input
                    type="text"
                    value={band.label}
                    onChange={(e) => updateBand(lane.id, band.id, "label", e.target.value)}
                    placeholder="label"
                    style={{ ...inputSm, flex: 1 }}
                  />
                  <button
                    onClick={() => removeBand(lane.id, band.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: 11, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                onClick={() => addBand(lane.id)}
                className="text-xs"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", textAlign: "left", padding: 0 }}
              >
                + bande
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={downloadSVG}
          className="rounded px-3 py-2 text-xs font-semibold w-full"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
        >
          ⬇ Télécharger SVG
        </button>
      </div>

      {/* ── Right panel: gel preview ── */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-8" style={{ background: "var(--bg)" }}>
        <div ref={gelContainerRef} style={{ display: "inline-block" }}>
          <GelSVG lanes={lanes} ladderKey={ladderKey} showSizes={showSizes} />
          <p className="text-center text-xs mt-3" style={{ color: "var(--fg-subtle)" }}>
            M = {ladderKey} · {lanes.length} puits
          </p>
        </div>
      </div>
    </div>
  );
}
