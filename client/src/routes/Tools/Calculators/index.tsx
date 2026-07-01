import { useState } from "react";

// ── Tm calculation ────────────────────────────────────────────────────────────

const NN_PARAMS: Record<string, [number, number]> = {
  AA: [-7.9, -22.2], AT: [-7.2, -20.4], TA: [-7.2, -21.3],
  CA: [-8.5, -22.7], GT: [-8.4, -22.4], CT: [-7.8, -21.0],
  GA: [-8.2, -22.2], CG: [-10.6, -27.2], GC: [-9.8, -24.4],
  GG: [-8.0, -19.9], AC: [-7.8, -21.0], TC: [-8.2, -22.2],
  AG: [-8.5, -22.7], TG: [-8.4, -22.4], TT: [-7.9, -22.2],
  CC: [-8.0, -19.9],
};

function calcTm(raw: string): { tm: number; method: string } | null {
  const s = raw.toUpperCase().replace(/[^ACGT]/g, "");
  const n = s.length;
  if (n < 2) return null;

  let A = 0, T = 0, G = 0, C = 0;
  for (const ch of s) {
    if (ch === "A") A++;
    else if (ch === "T") T++;
    else if (ch === "G") G++;
    else if (ch === "C") C++;
  }

  if (n <= 14) {
    return { tm: 2 * (A + T) + 4 * (G + C), method: "Wallace" };
  }

  let dH = 0, dS = 0;
  for (let i = 0; i < n - 1; i++) {
    const pair = s[i] + s[i + 1];
    const vals = NN_PARAMS[pair];
    if (vals) { dH += vals[0]; dS += vals[1]; }
  }
  // Initiation
  if ("GC".includes(s[0]))     { dH += 0.1; dS -= 2.8; } else { dH += 2.3; dS += 4.1; }
  if ("GC".includes(s[n - 1])) { dH += 0.1; dS -= 2.8; } else { dH += 2.3; dS += 4.1; }

  const R = 1.987; // cal·mol⁻¹·K⁻¹
  const CT = 250e-9; // 250 nM
  const tm = (dH * 1000) / (dS + R * Math.log(CT / 4)) - 273.15;
  return { tm, method: "SantaLucia 1997" };
}

// ── GC% ───────────────────────────────────────────────────────────────────────

function calcGC(raw: string) {
  const s = raw.toUpperCase().replace(/[^ACGT]/g, "");
  if (s.length === 0) return null;
  const G = (s.match(/G/g) ?? []).length;
  const C = (s.match(/C/g) ?? []).length;
  return { gc: ((G + C) / s.length) * 100, G, C, A: (s.match(/A/g) ?? []).length, T: (s.match(/T/g) ?? []).length, total: s.length };
}

// ── Reverse complement ────────────────────────────────────────────────────────

const COMP: Record<string, string> = { A: "T", T: "A", G: "C", C: "G", N: "N" };

function reverseComplement(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^ACGTN]/g, "")
    .split("")
    .reverse()
    .map((c) => COMP[c] ?? "N")
    .join("");
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--fg)",
  outline: "none",
  width: "100%",
  fontFamily: "var(--font-mono)",
};

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--fg-subtle)",
  display: "block",
  marginBottom: 6,
};

const RESULT_BOX: React.CSSProperties = {
  background: "color-mix(in oklab, var(--primary) 6%, transparent)",
  border: "1px solid color-mix(in oklab, var(--primary) 20%, transparent)",
  borderRadius: 8,
  padding: "14px 18px",
};

// ── Tab components ────────────────────────────────────────────────────────────

function TmTab() {
  const [seq, setSeq] = useState("");
  const result = seq.trim() ? calcTm(seq.trim()) : null;

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 540 }}>
      <div>
        <label style={LABEL}>Séquence oligonucléotide (5′→3′)</label>
        <textarea
          rows={3}
          value={seq}
          onChange={(e) => setSeq(e.target.value)}
          placeholder="ATCGGCTATCGATCG…"
          style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
        />
        <p className="mt-1 text-xs" style={{ color: "var(--fg-subtle)" }}>
          Seuls les caractères A, T, G, C sont pris en compte.
        </p>
      </div>

      {result && (
        <div style={RESULT_BOX}>
          <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
            {result.tm.toFixed(1)} °C
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
            Méthode : {result.method}
            {result.method === "SantaLucia 1997" && " · [Mg²⁺] et sel non pris en compte"}
          </p>
        </div>
      )}

      <div
        className="rounded-lg px-4 py-3 text-xs"
        style={{ background: "var(--surface-2)", color: "var(--fg-muted)", lineHeight: 1.7 }}
      >
        <strong style={{ color: "var(--fg)" }}>Méthodes utilisées</strong><br />
        ≤ 14 nt : règle de Wallace — Tm = 2(A+T) + 4(G+C)<br />
        ≥ 15 nt : nearest-neighbor SantaLucia 1997, [oligo] = 250 nM
      </div>
    </div>
  );
}

function GCTab() {
  const [seq, setSeq] = useState("");
  const result = seq.trim() ? calcGC(seq.trim()) : null;

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 540 }}>
      <div>
        <label style={LABEL}>Séquence</label>
        <textarea
          rows={4}
          value={seq}
          onChange={(e) => setSeq(e.target.value)}
          placeholder="ATCGGCTATCGATCG…"
          style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
        />
      </div>

      {result && (
        <div style={RESULT_BOX}>
          <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
            {result.gc.toFixed(1)} %
          </p>
          <p className="text-sm mt-1 font-medium" style={{ color: "var(--fg)" }}>
            GC%
          </p>

          {/* Progress bar */}
          <div
            className="mt-3 rounded-full overflow-hidden"
            style={{ height: 8, background: "var(--border)" }}
          >
            <div
              style={{
                width: `${result.gc}%`,
                height: "100%",
                background: "var(--primary)",
                borderRadius: 9999,
                transition: "width 0.2s",
              }}
            />
          </div>

          {/* Counts */}
          <div className="flex gap-6 mt-3">
            {(["G", "C", "A", "T"] as const).map((base) => (
              <div key={base}>
                <p className="text-xs font-semibold" style={{ color: "var(--fg-subtle)" }}>{base}</p>
                <p className="text-sm font-bold" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
                  {result[base]}
                </p>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--fg-subtle)" }}>Total</p>
              <p className="text-sm font-bold" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
                {result.total}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RCTab() {
  const [seq, setSeq] = useState("");
  const [copied, setCopied] = useState(false);
  const rc = seq.trim() ? reverseComplement(seq.trim()) : "";

  function handleCopy() {
    navigator.clipboard.writeText(rc).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 540 }}>
      <div>
        <label style={LABEL}>Séquence d'entrée (5′→3′)</label>
        <textarea
          rows={3}
          value={seq}
          onChange={(e) => setSeq(e.target.value)}
          placeholder="ATCGGCTATCGATCG…"
          style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
        />
      </div>

      {rc && (
        <div style={RESULT_BOX}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
              Brin complémentaire inverse (5′→3′)
            </p>
            <button
              onClick={handleCopy}
              className="text-xs rounded px-2 py-1"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--fg-muted)",
                cursor: "pointer",
              }}
            >
              {copied ? "✓ Copié" : "Copier"}
            </button>
          </div>
          <p
            className="text-sm break-all"
            style={{ color: "var(--primary)", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}
          >
            {rc}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--fg-subtle)" }}>
            {rc.length} nt
          </p>
        </div>
      )}
    </div>
  );
}

function DilutionTab() {
  const [c1, setC1] = useState("");
  const [v1, setV1] = useState("");
  const [c2, setC2] = useState("");
  const [v2, setV2] = useState("");

  const filled = [c1, v1, c2, v2].filter((v) => v.trim() !== "").length;
  const vals = { c1: parseFloat(c1), v1: parseFloat(v1), c2: parseFloat(c2), v2: parseFloat(v2) };

  let result: { label: string; value: number } | null = null;

  if (!c1 && v1 && c2 && v2 && !isNaN(vals.v1) && !isNaN(vals.c2) && !isNaN(vals.v2) && vals.v2 !== 0) {
    result = { label: "C1", value: (vals.c2 * vals.v2) / vals.v1 };
  } else if (c1 && !v1 && c2 && v2 && !isNaN(vals.c1) && !isNaN(vals.c2) && !isNaN(vals.v2) && vals.c1 !== 0) {
    result = { label: "V1", value: (vals.c2 * vals.v2) / vals.c1 };
  } else if (c1 && v1 && !c2 && v2 && !isNaN(vals.c1) && !isNaN(vals.v1) && !isNaN(vals.v2) && vals.v2 !== 0) {
    result = { label: "C2", value: (vals.c1 * vals.v1) / vals.v2 };
  } else if (c1 && v1 && c2 && !v2 && !isNaN(vals.c1) && !isNaN(vals.v1) && !isNaN(vals.c2) && vals.c2 !== 0) {
    result = { label: "V2", value: (vals.c1 * vals.v1) / vals.c2 };
  }

  const fieldStyle = (empty: boolean): React.CSSProperties => ({
    ...INPUT,
    borderColor: empty ? "color-mix(in oklab, var(--primary) 40%, var(--border))" : "var(--border)",
  });

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 400 }}>
      <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
        Laissez <strong style={{ color: "var(--fg)" }}>un seul champ vide</strong> pour qu'il soit calculé automatiquement (C₁V₁ = C₂V₂).
      </p>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {[
          { label: "C1 (concentration initiale)", val: c1, set: setC1, placeholder: "ex: 10 µM" },
          { label: "V1 (volume prélevé)", val: v1, set: setV1, placeholder: "ex: 5 µL" },
          { label: "C2 (concentration finale)", val: c2, set: setC2, placeholder: "ex: 1 µM" },
          { label: "V2 (volume final)", val: v2, set: setV2, placeholder: "ex: 50 µL" },
        ].map(({ label, val, set, placeholder }) => (
          <div key={label}>
            <label style={LABEL}>{label}</label>
            <input
              type="text"
              inputMode="decimal"
              value={val}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
              style={fieldStyle(!val)}
            />
          </div>
        ))}
      </div>

      {filled === 4 && !result && (
        <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
          Laissez un champ vide pour calculer la valeur manquante.
        </p>
      )}

      {result && (
        <div style={RESULT_BOX}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--fg-subtle)" }}>
            {result.label} calculé
          </p>
          <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
            {result.value % 1 === 0 ? result.value : result.value.toFixed(4)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
            Unité identique à celle utilisée en entrée
          </p>
        </div>
      )}
    </div>
  );
}

// ── Molecular mass ────────────────────────────────────────────────────────────

// ssDNA per-nucleotide weights (Da), phosphate included, -61.96 terminal correction
const DNA_W: Record<string, number> = { A: 313.21, T: 304.19, G: 329.21, C: 289.18 };

// Average amino acid residue masses (Da)
const AA_W: Record<string, number> = {
  A: 71.08, R: 156.19, N: 114.10, D: 115.09, C: 103.14, E: 129.12, Q: 128.13,
  G: 57.05, H: 137.14, I: 113.16, L: 113.16, K: 128.17, M: 131.20, F: 147.18,
  P: 97.12, S: 87.08, T: 101.10, W: 186.21, Y: 163.18, V: 99.13,
};

function calcDNAMass(raw: string, ds: boolean): { mw: number; n: number } | null {
  const s = raw.toUpperCase().replace(/[^ACGT]/g, "");
  if (!s.length) return null;
  let mw = s.split("").reduce((sum, c) => sum + (DNA_W[c] ?? 0), 0) - 61.96;
  if (ds) mw *= 2;
  return { mw, n: s.length };
}

function calcProteinMass(raw: string): { mw: number; n: number } | null {
  const s = raw.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s.length) return null;
  const mw = s.split("").reduce((sum, c) => sum + (AA_W[c] ?? 0), 0) + 18.02;
  const valid = s.split("").filter((c) => c in AA_W).length;
  if (valid === 0) return null;
  return { mw, n: s.length };
}

function MassTab() {
  const [dnaSeq, setDnaSeq] = useState("");
  const [ds, setDs] = useState(false);
  const [protSeq, setProtSeq] = useState("");

  const dnaResult = dnaSeq.trim() ? calcDNAMass(dnaSeq.trim(), ds) : null;
  const protResult = protSeq.trim() ? calcProteinMass(protSeq.trim()) : null;

  return (
    <div className="flex flex-col gap-8" style={{ maxWidth: 560 }}>
      {/* DNA */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label style={LABEL}>Oligonucléotide / fragment ADN</label>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--fg-muted)" }}>Simple brin</span>
            <button
              onClick={() => setDs((v) => !v)}
              className="rounded-full"
              style={{
                width: 36, height: 20, position: "relative", cursor: "pointer",
                background: ds ? "var(--primary)" : "var(--border)", border: "none",
                transition: "background 0.15s",
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: ds ? 18 : 3,
                width: 14, height: 14, borderRadius: "50%",
                background: "#fff", transition: "left 0.15s",
              }} />
            </button>
            <span className="text-xs" style={{ color: "var(--fg-muted)" }}>Double brin</span>
          </div>
        </div>
        <textarea
          rows={3}
          value={dnaSeq}
          onChange={(e) => setDnaSeq(e.target.value)}
          placeholder="ATCGGCTATCGATCG…"
          style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
        />
        {dnaResult && (
          <div style={RESULT_BOX}>
            <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
              {dnaResult.mw >= 1000
                ? `${(dnaResult.mw / 1000).toFixed(2)} kDa`
                : `${dnaResult.mw.toFixed(1)} Da`}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
              {ds ? "ADN double brin" : "ADN simple brin"} · {dnaResult.n} nt
              {ds && ` · ${(dnaResult.n).toLocaleString("fr-FR")} pb`}
            </p>
          </div>
        )}
      </div>

      {/* Protein */}
      <div className="flex flex-col gap-3">
        <label style={LABEL}>Séquence protéique (acides aminés, 1 lettre)</label>
        <textarea
          rows={3}
          value={protSeq}
          onChange={(e) => setProtSeq(e.target.value)}
          placeholder="MKTLLLTLVVVTIVCLDLGYTLK…"
          style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
        />
        {protResult && (
          <div style={RESULT_BOX}>
            <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
              {protResult.mw >= 1000
                ? `${(protResult.mw / 1000).toFixed(2)} kDa`
                : `${protResult.mw.toFixed(1)} Da`}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
              Protéine · {protResult.n} aa · masses moyennes des résidus
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "tm" | "gc" | "rc" | "dilution" | "mass";

const TABS: { id: Tab; label: string }[] = [
  { id: "tm",       label: "Tm Primer" },
  { id: "gc",       label: "GC%" },
  { id: "rc",       label: "Compl. inverse" },
  { id: "dilution", label: "Dilution" },
  { id: "mass",     label: "Masse mol." },
];

export default function CalculatorsPage() {
  const [tab, setTab] = useState<Tab>("tm");

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="px-8 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <h1 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
          Calculateurs
        </h1>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-0 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-5 py-2.5 text-sm font-medium"
            style={{
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
              color: tab === t.id ? "var(--primary)" : "var(--fg-muted)",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {tab === "tm"       && <TmTab />}
        {tab === "gc"       && <GCTab />}
        {tab === "rc"       && <RCTab />}
        {tab === "dilution" && <DilutionTab />}
        {tab === "mass"     && <MassTab />}
      </div>
    </div>
  );
}
