import { useState } from "react";

// ── Algorithms ────────────────────────────────────────────────────────────────

interface AlignResult {
  aligned1: string;
  aligned2: string;
  score: number;
  identity: number;   // 0-100
  gaps: number;       // count of gap chars
  length: number;     // alignment length
}

function smithWaterman(s1: string, s2: string, match = 2, mismatch = -1, gap = -2): AlignResult {
  const n = s1.length, m = s2.length;
  const H = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
  const T = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1)); // 1=diag 2=up 3=left

  let maxScore = 0, maxI = 0, maxJ = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sc = s1[i - 1] === s2[j - 1] ? match : mismatch;
      const d = H[i - 1][j - 1] + sc;
      const u = H[i - 1][j] + gap;
      const l = H[i][j - 1] + gap;
      const v = Math.max(0, d, u, l);
      H[i][j] = v;
      T[i][j] = v === 0 ? 0 : v === d ? 1 : v === u ? 2 : 3;
      if (v > maxScore) { maxScore = v; maxI = i; maxJ = j; }
    }
  }
  const a1: string[] = [], a2: string[] = [];
  let i = maxI, j = maxJ;
  while (H[i][j] > 0) {
    if (T[i][j] === 1) { a1.unshift(s1[i - 1]); a2.unshift(s2[j - 1]); i--; j--; }
    else if (T[i][j] === 2) { a1.unshift(s1[i - 1]); a2.unshift("-"); i--; }
    else { a1.unshift("-"); a2.unshift(s2[j - 1]); j--; }
  }
  return buildResult(a1.join(""), a2.join(""), maxScore);
}

function needlemanWunsch(s1: string, s2: string, match = 2, mismatch = -1, gap = -2): AlignResult {
  const n = s1.length, m = s2.length;
  const H = Array.from({ length: n + 1 }, (_, i) =>
    Float32Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j * gap : j === 0 ? i * gap : 0))
  );
  const T = Array.from({ length: n + 1 }, (_, i) =>
    Uint8Array.from({ length: m + 1 }, (_, j) => (i === 0 ? 3 : j === 0 ? 2 : 0))
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sc = s1[i - 1] === s2[j - 1] ? match : mismatch;
      const d = H[i - 1][j - 1] + sc, u = H[i - 1][j] + gap, l = H[i][j - 1] + gap;
      H[i][j] = Math.max(d, u, l);
      T[i][j] = H[i][j] === d ? 1 : H[i][j] === u ? 2 : 3;
    }
  }
  const a1: string[] = [], a2: string[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (T[i][j] === 1) { a1.unshift(s1[i - 1]); a2.unshift(s2[j - 1]); i--; j--; }
    else if (T[i][j] === 2) { a1.unshift(s1[i - 1]); a2.unshift("-"); i--; }
    else { a1.unshift("-"); a2.unshift(s2[j - 1]); j--; }
  }
  return buildResult(a1.join(""), a2.join(""), H[n][m]);
}

function buildResult(a1: string, a2: string, score: number): AlignResult {
  const len = a1.length;
  let matches = 0, gaps = 0;
  for (let k = 0; k < len; k++) {
    if (a1[k] === "-" || a2[k] === "-") gaps++;
    else if (a1[k] === a2[k]) matches++;
  }
  return { aligned1: a1, aligned2: a2, score, identity: len > 0 ? (matches / len) * 100 : 0, gaps, length: len };
}

// ── Visual alignment display ──────────────────────────────────────────────────

const BLOCK = 60;

function AlignDisplay({ result, name1, name2 }: { result: AlignResult; name1: string; name2: string }) {
  const { aligned1, aligned2 } = result;
  const blocks: { start: number; a1: string; mid: string; a2: string }[] = [];

  for (let i = 0; i < aligned1.length; i += BLOCK) {
    const a1 = aligned1.slice(i, i + BLOCK);
    const a2 = aligned2.slice(i, i + BLOCK);
    const mid = a1.split("").map((c, k) => {
      if (c === "-" || a2[k] === "-") return " ";
      return c === a2[k] ? "|" : ".";
    }).join("");
    blocks.push({ start: i + 1, a1, mid, a2 });
  }

  function coloredSeq(seq: string, ref: string) {
    return seq.split("").map((c, k) => {
      let color = "var(--fg)";
      if (c === "-") color = "var(--fg-subtle)";
      else if (ref[k] === "-") color = "var(--fg-subtle)";
      else if (c === ref[k]) color = "#22C55E";
      else color = "#EF4444";
      return (
        <span key={k} style={{ color }}>
          {c}
        </span>
      );
    });
  }

  const lbl1 = name1.slice(0, 8).padEnd(8);
  const lbl2 = name2.slice(0, 8).padEnd(8);

  return (
    <div
      className="rounded-lg p-4 overflow-x-auto"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.8,
      }}
    >
      {blocks.map((b) => (
        <div key={b.start} className="mb-4">
          <div>
            <span style={{ color: "var(--fg-muted)", userSelect: "none" }}>
              {lbl1} {String(b.start).padStart(5)}{" "}
            </span>
            {coloredSeq(b.a1, b.a2)}
          </div>
          <div>
            <span style={{ color: "transparent", userSelect: "none" }}>
              {"        " + "      "}
            </span>
            <span style={{ color: "var(--fg-subtle)" }}>{b.mid}</span>
          </div>
          <div>
            <span style={{ color: "var(--fg-muted)", userSelect: "none" }}>
              {lbl2} {String(b.start).padStart(5)}{" "}
            </span>
            {coloredSeq(b.a2, b.a1)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 12,
  color: "var(--fg)",
  outline: "none",
  width: "100%",
  fontFamily: "var(--font-mono)",
  lineHeight: 1.6,
  resize: "vertical",
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

const MAX_LEN = 2000;

export default function AlignmentPage() {
  const [seq1, setSeq1] = useState("");
  const [seq2, setSeq2] = useState("");
  const [name1, setName1] = useState("Séquence 1");
  const [name2, setName2] = useState("Séquence 2");
  const [mode, setMode] = useState<"local" | "global">("local");
  const [match, setMatch] = useState("2");
  const [mismatch, setMismatch] = useState("-1");
  const [gap, setGap] = useState("-2");
  const [result, setResult] = useState<AlignResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clean(s: string) {
    return s.toUpperCase().replace(/[^A-Z]/g, "");
  }

  function handleAlign() {
    setError(null);
    const s1 = clean(seq1);
    const s2 = clean(seq2);
    if (!s1 || !s2) { setError("Les deux séquences sont obligatoires."); return; }
    if (s1.length > MAX_LEN || s2.length > MAX_LEN) {
      setError(`Séquences limitées à ${MAX_LEN} caractères par sécurité (calcul dans le navigateur).`);
      return;
    }
    const m = parseFloat(match) || 2;
    const mm = parseFloat(mismatch) || -1;
    const g = parseFloat(gap) || -2;
    const r = mode === "local" ? smithWaterman(s1, s2, m, mm, g) : needlemanWunsch(s1, s2, m, mm, g);
    setResult(r);
  }

  const s1clean = clean(seq1);
  const s2clean = clean(seq2);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="px-8 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <h1 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
          Alignement de séquences
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

        {/* Mode toggle */}
        <div className="flex gap-2">
          {(["local", "global"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="rounded px-4 py-1.5 text-sm font-medium"
              style={{
                background: mode === m ? "var(--primary)" : "var(--surface-2)",
                color: mode === m ? "#fff" : "var(--fg-muted)",
                border: `1px solid ${mode === m ? "var(--primary)" : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              {m === "local" ? "Local — Smith-Waterman" : "Global — Needleman-Wunsch"}
            </button>
          ))}
          <span className="text-xs self-center" style={{ color: "var(--fg-subtle)" }}>
            {mode === "local"
              ? "Meilleure région similaire entre les deux séquences"
              : "Alignement complet bout-à-bout"}
          </span>
        </div>

        {/* Sequences */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="flex flex-col gap-2">
            <input
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                padding: "2px 0",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--fg)",
                outline: "none",
                width: "100%",
              }}
              placeholder="Nom séquence 1"
            />
            <textarea
              rows={5}
              value={seq1}
              onChange={(e) => setSeq1(e.target.value)}
              placeholder="ATCGGCTATCGATCG… (ADN, ARN, protéine)"
              style={INPUT}
            />
            {s1clean.length > 0 && (
              <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                {s1clean.length} nt{s1clean.length > MAX_LEN ? ` — ⚠ max ${MAX_LEN}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              value={name2}
              onChange={(e) => setName2(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                padding: "2px 0",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--fg)",
                outline: "none",
                width: "100%",
              }}
              placeholder="Nom séquence 2"
            />
            <textarea
              rows={5}
              value={seq2}
              onChange={(e) => setSeq2(e.target.value)}
              placeholder="ATCGGCTATCGATCG… (ADN, ARN, protéine)"
              style={INPUT}
            />
            {s2clean.length > 0 && (
              <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                {s2clean.length} nt{s2clean.length > MAX_LEN ? ` — ⚠ max ${MAX_LEN}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Score params */}
        <div className="flex items-end gap-4">
          {[
            { label: "Match", val: match, set: setMatch },
            { label: "Mismatch", val: mismatch, set: setMismatch },
            { label: "Gap", val: gap, set: setGap },
          ].map(({ label, val, set }) => (
            <div key={label} className="flex flex-col gap-1">
              <label style={LABEL}>{label}</label>
              <input
                type="number"
                value={val}
                onChange={(e) => set(e.target.value)}
                style={{ ...INPUT, width: 80, resize: "none" }}
              />
            </div>
          ))}
          <button
            onClick={handleAlign}
            className="rounded px-6 py-2 text-sm font-semibold"
            style={{
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              height: 36,
            }}
          >
            Aligner
          </button>
        </div>

        {error && (
          <p
            className="text-xs rounded px-3 py-2"
            style={{
              background: "color-mix(in oklab,var(--danger) 10%,transparent)",
              color: "var(--danger)",
            }}
          >
            {error}
          </p>
        )}

        {/* Result */}
        {result && (
          <div className="flex flex-col gap-4">
            {/* Stats banner */}
            <div
              className="flex gap-6 rounded-lg px-5 py-3"
              style={{
                background: "color-mix(in oklab,var(--primary) 6%,transparent)",
                border: "1px solid color-mix(in oklab,var(--primary) 20%,transparent)",
              }}
            >
              {[
                { label: "Score", value: result.score.toFixed(0) },
                { label: "Identité", value: `${result.identity.toFixed(1)} %` },
                { label: "Longueur", value: `${result.length} nt` },
                { label: "Gaps", value: result.gaps.toString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>{label}</p>
                  <p className="text-lg font-bold" style={{ color: "var(--primary)" }}>{value}</p>
                </div>
              ))}
              <div className="flex-1" />
              <div className="flex gap-3 text-xs self-center" style={{ color: "var(--fg-muted)" }}>
                <span><span style={{ color: "#22C55E" }}>■</span> Match</span>
                <span><span style={{ color: "#EF4444" }}>■</span> Mismatch</span>
                <span><span style={{ color: "var(--fg-subtle)" }}>■</span> Gap</span>
              </div>
            </div>

            {/* Alignment display */}
            <AlignDisplay result={result} name1={name1} name2={name2} />
          </div>
        )}
      </div>
    </div>
  );
}
