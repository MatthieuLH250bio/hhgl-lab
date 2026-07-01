import type { PlasmidFeature } from "../../../types/database";
import { kindColor } from "./PlasmidMap";

interface Props {
  features: PlasmidFeature[];
  totalBp: number;
}

export default function FeaturePanel({ features, totalBp }: Props) {
  const sorted = [...features].sort((a, b) => a.start_bp - b.start_bp);

  if (features.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg px-6 py-8"
        style={{ border: "1px dashed var(--border)", color: "var(--fg-subtle)", fontSize: 13 }}
      >
        Aucune feature annotée
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" style={{ minWidth: 260 }}>
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-1"
        style={{ color: "var(--fg-subtle)" }}
      >
        Features ({features.length})
      </p>

      {sorted.map((f) => {
        const color = kindColor(f.kind, f.color);
        const pct =
          totalBp > 0
            ? (((f.end_bp - f.start_bp) / totalBp) * 100).toFixed(1)
            : null;

        return (
          <div
            key={f.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: color,
                flexShrink: 0,
              }}
            />
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: "var(--fg)" }}
              >
                {f.name}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}
              >
                {f.start_bp.toLocaleString("fr-FR")}–{f.end_bp.toLocaleString("fr-FR")} bp
                {pct && ` · ${pct}%`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              {f.kind && (
                <span
                  className="text-xs rounded px-1.5 py-0.5"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--fg-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {f.kind}
                </span>
              )}
              {f.strand && (
                <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                  {f.strand === "+" ? "→" : f.strand === "-" ? "←" : f.strand}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
