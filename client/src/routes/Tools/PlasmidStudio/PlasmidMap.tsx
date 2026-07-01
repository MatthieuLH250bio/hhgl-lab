import { useState } from "react";
import type { Plasmid, PlasmidFeature } from "../../../types/database";

const CX = 200, CY = 200;
const BACKBONE_R = 98;
const OUTER_R = 116;
const INNER_R = 93;
const LABEL_R = 134;

export const KIND_COLORS: Record<string, string> = {
  cds:        "#3B82F6",
  promoter:   "#22C55E",
  terminator: "#EF4444",
  rbs:        "#EAB308",
  ori:        "#A855F7",
  tag:        "#F97316",
  misc:       "#14B8A6",
};
const DEFAULT_COLOR = "#6B7280";

export function kindColor(kind?: string | null, override?: string | null): string {
  if (override) return override;
  return KIND_COLORS[kind ?? ""] ?? DEFAULT_COLOR;
}

function bpToAngle(bp: number, total: number): number {
  return -Math.PI / 2 + (bp / total) * 2 * Math.PI;
}

function polar(angle: number, r: number): { x: number; y: number } {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function arcPath(f: PlasmidFeature, total: number): string {
  const sa = bpToAngle(f.start_bp, total);
  const ea = bpToAngle(f.end_bp, total);
  const large = (f.end_bp - f.start_bp) / total > 0.5 ? 1 : 0;
  const o1 = polar(sa, OUTER_R);
  const o2 = polar(ea, OUTER_R);
  const i1 = polar(sa, INNER_R);
  const i2 = polar(ea, INNER_R);
  const fmt = (n: number) => n.toFixed(2);
  return (
    `M ${fmt(o1.x)} ${fmt(o1.y)} ` +
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${fmt(o2.x)} ${fmt(o2.y)} ` +
    `L ${fmt(i2.x)} ${fmt(i2.y)} ` +
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${fmt(i1.x)} ${fmt(i1.y)} Z`
  );
}

interface Props {
  plasmid: Plasmid;
}

export default function PlasmidMap({ plasmid }: Props) {
  const features = plasmid.features ?? [];
  const total =
    plasmid.length_bp ??
    (features.length > 0 ? Math.max(...features.map((f) => f.end_bp)) : 5000);

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const shortName =
    plasmid.name.length > 14 ? plasmid.name.slice(0, 13) + "…" : plasmid.name;

  return (
    <div className="flex flex-col items-center gap-4" style={{ flexShrink: 0 }}>
      <svg
        viewBox="0 0 400 400"
        width={340}
        height={340}
        style={{ overflow: "visible" }}
      >
        {/* Backbone */}
        <circle
          cx={CX}
          cy={CY}
          r={BACKBONE_R}
          fill="none"
          stroke="var(--border)"
          strokeWidth={2}
        />

        {/* Tick at 0 bp (12h) */}
        <line
          x1={CX}
          y1={CY - BACKBONE_R - 8}
          x2={CX}
          y2={CY - BACKBONE_R + 4}
          stroke="var(--border)"
          strokeWidth={1.5}
        />

        {/* Feature arcs */}
        {features.map((f) => {
          const color = kindColor(f.kind, f.color);
          const hovered = hoveredId === f.id;
          return (
            <path
              key={f.id}
              d={arcPath(f, total)}
              fill={color}
              opacity={hoveredId !== null && !hovered ? 0.35 : 0.85}
              stroke={hovered ? color : "none"}
              strokeWidth={hovered ? 1.5 : 0}
              style={{ cursor: "pointer", transition: "opacity 0.12s" }}
              onMouseEnter={() => setHoveredId(f.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          );
        })}

        {/* Labels */}
        {features.map((f) => {
          const midBp = (f.start_bp + f.end_bp) / 2;
          const angle = bpToAngle(midBp, total);
          const pos = polar(angle, LABEL_R + 10);
          const anchor =
            Math.cos(angle) > 0.12 ? "start" : Math.cos(angle) < -0.12 ? "end" : "middle";
          const hovered = hoveredId === f.id;
          return (
            <text
              key={f.id}
              x={pos.x}
              y={pos.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={10.5}
              fontWeight={hovered ? 700 : 400}
              fill={hovered ? "var(--fg)" : "var(--fg-muted)"}
              style={{ pointerEvents: "none", fontFamily: "var(--font-mono)" }}
            >
              {f.name}
            </text>
          );
        })}

        {/* Center: name + size */}
        <text
          x={CX}
          y={CY - 9}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={600}
          fill="var(--fg)"
        >
          {shortName}
        </text>
        <text
          x={CX}
          y={CY + 9}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill="var(--fg-muted)"
        >
          {total.toLocaleString("fr-FR")} bp
        </text>
      </svg>

      {/* Legend */}
      {features.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {[...new Set(features.map((f) => f.kind).filter(Boolean))].map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: KIND_COLORS[k!] ?? DEFAULT_COLOR,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                {k}
              </span>
            </div>
          ))}
        </div>
      )}

      {features.length === 0 && (
        <p className="text-xs text-center" style={{ color: "var(--fg-subtle)" }}>
          Aucune feature annotée.
        </p>
      )}
    </div>
  );
}
