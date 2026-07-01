import { useState } from "react";

// ── Math helpers ──────────────────────────────────────────────────────────────

function lgamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Regularized incomplete beta function I_x(a,b) via continued fraction (Lentz)
function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x > (a + 1) / (a + b + 2)) return 1 - incompleteBeta(1 - x, b, a);
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;
  const FPMIN = 1e-300, EPS = 3e-7;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    let aa = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  return front * h;
}

// Two-tailed t p-value
function tPValue(t: number, df: number): number {
  return incompleteBeta(df / (df + t * t), df / 2, 0.5);
}

// F-distribution upper-tail p-value
function fPValue(F: number, df1: number, df2: number): number {
  return incompleteBeta(df2 / (df2 + df1 * F), df2 / 2, df1 / 2);
}

// ── Descriptive stats ─────────────────────────────────────────────────────────

interface DescStats {
  n: number; mean: number; median: number; sd: number; sem: number;
  min: number; max: number; cv: number;
}

function descStats(values: number[]): DescStats {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sorted = [...values].sort((a, b) => a - b);
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const sem = sd / Math.sqrt(n);
  return { n, mean, median, sd, sem, min: sorted[0], max: sorted[n - 1], cv: (sd / mean) * 100 };
}

// ── Parse input ───────────────────────────────────────────────────────────────

function parseNums(raw: string): number[] | null {
  const vals = raw.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
  if (vals.some(isNaN) || vals.length === 0) return null;
  return vals;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background: "var(--surface-2)", border: "1px solid var(--border)",
  borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "var(--fg)",
  outline: "none", width: "100%", fontFamily: "var(--font-mono)",
  resize: "vertical", lineHeight: 1.6,
};

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "var(--fg-subtle)", display: "block", marginBottom: 6,
};

function StatRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-1.5"
      style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--fg-muted)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "var(--fg)", fontFamily: mono ? "var(--font-mono)" : undefined }}>
        {value}
      </span>
    </div>
  );
}

function StatsBox({ stats, title }: { stats: DescStats; title: string }) {
  return (
    <div className="flex flex-col gap-0" style={{ minWidth: 200 }}>
      <p className="text-xs font-semibold mb-2 truncate" style={{ color: "var(--primary)" }}>{title}</p>
      <StatRow label="n" value={stats.n.toString()} />
      <StatRow label="Moyenne" value={stats.mean.toFixed(4)} mono />
      <StatRow label="Médiane" value={stats.median.toFixed(4)} mono />
      <StatRow label="SD" value={stats.sd.toFixed(4)} mono />
      <StatRow label="SEM" value={stats.sem.toFixed(4)} mono />
      <StatRow label="Min" value={stats.min.toFixed(4)} mono />
      <StatRow label="Max" value={stats.max.toFixed(4)} mono />
      <StatRow label="CV%" value={`${stats.cv.toFixed(1)} %`} mono />
    </div>
  );
}

function pLabel(p: number) {
  if (p < 0.001) return "p < 0.001 ***";
  if (p < 0.01)  return `p = ${p.toFixed(4)} **`;
  if (p < 0.05)  return `p = ${p.toFixed(4)} *`;
  return `p = ${p.toFixed(4)} ns`;
}

function pColor(p: number) {
  if (p < 0.05) return "#22C55E";
  return "var(--fg-muted)";
}

// ── Descriptif tab ────────────────────────────────────────────────────────────

function DescriptifTab() {
  const [raw, setRaw] = useState("");
  const vals = raw.trim() ? parseNums(raw) : null;
  const stats = vals && vals.length >= 2 ? descStats(vals) : null;
  const invalid = raw.trim() && !vals;

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 480 }}>
      <div>
        <label style={LABEL}>Valeurs (séparées par espaces, virgules ou retours à la ligne)</label>
        <textarea
          rows={5}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"1.2\n3.4\n2.8\n4.1\n3.0"}
          style={INPUT}
        />
        {invalid && (
          <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>
            Valeurs non numériques détectées.
          </p>
        )}
      </div>

      {stats && (
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <StatsBox stats={stats} title={`Groupe (${stats.n} valeurs)`} />
        </div>
      )}
    </div>
  );
}

// ── t-test tab ────────────────────────────────────────────────────────────────

function TTestTab() {
  const [raw1, setRaw1] = useState("");
  const [raw2, setRaw2] = useState("");
  const [name1, setName1] = useState("Groupe 1");
  const [name2, setName2] = useState("Groupe 2");

  const vals1 = raw1.trim() ? parseNums(raw1) : null;
  const vals2 = raw2.trim() ? parseNums(raw2) : null;
  const stats1 = vals1 && vals1.length >= 2 ? descStats(vals1) : null;
  const stats2 = vals2 && vals2.length >= 2 ? descStats(vals2) : null;

  let tResult: { t: number; df: number; p: number; cohensD: number } | null = null;
  if (stats1 && stats2) {
    const { mean: m1, sd: s1, n: n1 } = stats1;
    const { mean: m2, sd: s2, n: n2 } = stats2;
    const se = Math.sqrt(s1 ** 2 / n1 + s2 ** 2 / n2);
    const t = (m1 - m2) / se;
    const df = (s1 ** 2 / n1 + s2 ** 2 / n2) ** 2 /
      ((s1 ** 2 / n1) ** 2 / (n1 - 1) + (s2 ** 2 / n2) ** 2 / (n2 - 1));
    const p = tPValue(Math.abs(t), df);
    const pooledSD = Math.sqrt(((n1 - 1) * s1 ** 2 + (n2 - 1) * s2 ** 2) / (n1 + n2 - 2));
    const cohensD = (m1 - m2) / pooledSD;
    tResult = { t, df, p, cohensD };
  }

  const nameStyle: React.CSSProperties = {
    background: "transparent", border: "none",
    borderBottom: "1px solid var(--border)", padding: "2px 0",
    fontSize: 12, fontWeight: 600, color: "var(--fg)", outline: "none", width: "100%",
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr", maxWidth: 700 }}>
        {([
          { name: name1, setName: setName1, raw: raw1, setRaw: setRaw1 },
          { name: name2, setName: setName2, raw: raw2, setRaw: setRaw2 },
        ] as const).map(({ name, setName, raw, setRaw }, i) => (
          <div key={i} className="flex flex-col gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} style={nameStyle} />
            <textarea
              rows={6}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"1.2\n3.4\n2.8\n4.1\n3.0"}
              style={INPUT}
            />
          </div>
        ))}
      </div>

      {(stats1 || stats2) && (
        <div className="flex gap-8 flex-wrap rounded-lg p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {stats1 && <StatsBox stats={stats1} title={name1} />}
          {stats2 && <StatsBox stats={stats2} title={name2} />}
        </div>
      )}

      {tResult && (
        <div className="rounded-lg p-5" style={{
          background: "color-mix(in oklab,var(--primary) 5%,transparent)",
          border: "1px solid color-mix(in oklab,var(--primary) 20%,transparent)",
        }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: "var(--fg-subtle)" }}>
            Test t de Welch (bilatéral)
          </p>
          <div className="flex gap-6 flex-wrap">
            <div>
              <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>t</p>
              <p className="text-xl font-bold" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
                {tResult.t.toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>ddl</p>
              <p className="text-xl font-bold" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
                {tResult.df.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>p-value</p>
              <p className="text-xl font-bold" style={{ color: pColor(tResult.p), fontFamily: "var(--font-mono)" }}>
                {pLabel(tResult.p)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>Cohen d</p>
              <p className="text-xl font-bold" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
                {tResult.cohensD.toFixed(3)}
              </p>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--fg-subtle)" }}>
            |d| : &lt;0.2 négligeable · 0.2–0.5 petit · 0.5–0.8 moyen · &gt;0.8 grand
          </p>
        </div>
      )}
    </div>
  );
}

// ── ANOVA tab ─────────────────────────────────────────────────────────────────

function AnovaTab() {
  const [groups, setGroups] = useState([
    { name: "Groupe 1", raw: "" },
    { name: "Groupe 2", raw: "" },
    { name: "Groupe 3", raw: "" },
  ]);

  function updateGroup(i: number, field: "name" | "raw", val: string) {
    setGroups((prev) => prev.map((g, idx) => idx === i ? { ...g, [field]: val } : g));
  }

  function addGroup() {
    setGroups((prev) => [...prev, { name: `Groupe ${prev.length + 1}`, raw: "" }]);
  }

  function removeGroup(i: number) {
    if (groups.length <= 2) return;
    setGroups((prev) => prev.filter((_, idx) => idx !== i));
  }

  const parsed = groups.map((g) => ({
    name: g.name,
    vals: g.raw.trim() ? parseNums(g.raw) : null,
  }));

  const ready = parsed.filter((g) => g.vals && g.vals.length >= 2);

  let anova: { F: number; df1: number; df2: number; p: number; ssBetween: number; ssWithin: number; msB: number; msW: number } | null = null;
  if (ready.length >= 2) {
    const allGroups = ready.map((g) => ({ name: g.name, vals: g.vals!, stats: descStats(g.vals!) }));
    const N = allGroups.reduce((s, g) => s + g.stats.n, 0);
    const grandMean = allGroups.reduce((s, g) => s + g.stats.mean * g.stats.n, 0) / N;
    const df1 = allGroups.length - 1;
    const df2 = N - allGroups.length;
    const ssBetween = allGroups.reduce((s, g) => s + g.stats.n * (g.stats.mean - grandMean) ** 2, 0);
    const ssWithin = allGroups.reduce(
      (s, g) => s + g.vals.reduce((ss, v) => ss + (v - g.stats.mean) ** 2, 0), 0
    );
    const msB = ssBetween / df1;
    const msW = ssWithin / df2;
    const F = msB / msW;
    const p = fPValue(F, df1, df2);
    anova = { F, df1, df2, p, ssBetween, ssWithin, msB, msW };
  }

  const nameStyle: React.CSSProperties = {
    background: "transparent", border: "none",
    borderBottom: "1px solid var(--border)", padding: "2px 0",
    fontSize: 12, fontWeight: 600, color: "var(--fg)", outline: "none", width: "100%",
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Group inputs */}
      <div className="flex flex-wrap gap-3">
        {groups.map((g, i) => (
          <div key={i} className="flex flex-col gap-2" style={{ minWidth: 160, width: 180 }}>
            <div className="flex items-center gap-1">
              <input value={g.name} onChange={(e) => updateGroup(i, "name", e.target.value)}
                style={{ ...nameStyle, flex: 1 }} />
              {groups.length > 2 && (
                <button onClick={() => removeGroup(i)}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ color: "var(--fg-subtle)", background: "transparent", border: "none", cursor: "pointer" }}>
                  ×
                </button>
              )}
            </div>
            <textarea
              rows={7}
              value={g.raw}
              onChange={(e) => updateGroup(i, "raw", e.target.value)}
              placeholder={"1.2\n3.4\n2.8"}
              style={INPUT}
            />
            {parsed[i].vals && (
              <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                n={parsed[i].vals!.length} · moy={descStats(parsed[i].vals!).mean.toFixed(3)}
              </p>
            )}
          </div>
        ))}
        {groups.length < 8 && (
          <div className="flex items-start pt-6">
            <button onClick={addGroup}
              className="rounded px-3 py-1.5 text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}>
              + Groupe
            </button>
          </div>
        )}
      </div>

      {anova && (
        <div className="flex flex-col gap-4">
          {/* ANOVA table */}
          <div className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border)", fontSize: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["Source", "SS", "ddl", "MS", "F", "p-value"].map((h) => (
                    <th key={h} className="text-left px-3 py-2"
                      style={{ color: "var(--fg-subtle)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="px-3 py-2" style={{ color: "var(--fg)" }}>Inter-groupes</td>
                  <td className="px-3 py-2" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{anova.ssBetween.toFixed(4)}</td>
                  <td className="px-3 py-2" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{anova.df1}</td>
                  <td className="px-3 py-2" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{anova.msB.toFixed(4)}</td>
                  <td className="px-3 py-2 font-bold" style={{ color: "var(--primary)", fontFamily: "var(--font-mono)" }}>{anova.F.toFixed(3)}</td>
                  <td className="px-3 py-2 font-bold" style={{ color: pColor(anova.p), fontFamily: "var(--font-mono)" }}>{pLabel(anova.p)}</td>
                </tr>
                <tr style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="px-3 py-2" style={{ color: "var(--fg)" }}>Intra-groupes</td>
                  <td className="px-3 py-2" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{anova.ssWithin.toFixed(4)}</td>
                  <td className="px-3 py-2" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{anova.df2}</td>
                  <td className="px-3 py-2" style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{anova.msW.toFixed(4)}</td>
                  <td className="px-3 py-2" style={{ color: "var(--fg-subtle)" }}>—</td>
                  <td className="px-3 py-2" style={{ color: "var(--fg-subtle)" }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Per-group stats */}
          <div className="flex flex-wrap gap-5">
            {ready.map((g) => {
              const s = descStats(g.vals!);
              return (
                <div key={g.name} className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: 180 }}>
                  <StatsBox stats={s} title={g.name} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "descriptif" | "ttest" | "anova";

const TABS: { id: Tab; label: string }[] = [
  { id: "descriptif", label: "Descriptif" },
  { id: "ttest",      label: "t-test (Welch)" },
  { id: "anova",      label: "ANOVA 1 facteur" },
];

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>("descriptif");

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="px-8 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <h1 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>Statistiques</h1>
      </div>

      <div className="flex gap-0 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-5 py-2.5 text-sm font-medium"
            style={{
              background: "transparent", border: "none",
              borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
              color: tab === t.id ? "var(--primary)" : "var(--fg-muted)",
              cursor: "pointer", marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {tab === "descriptif" && <DescriptifTab />}
        {tab === "ttest"      && <TTestTab />}
        {tab === "anova"      && <AnovaTab />}
      </div>
    </div>
  );
}
