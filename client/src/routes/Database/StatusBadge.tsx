const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  available: { bg: "color-mix(in oklab, var(--success) 14%, transparent)", fg: "var(--success)" },
  low:       { bg: "color-mix(in oklab, var(--warning) 14%, transparent)", fg: "var(--warning)" },
  depleted:  { bg: "color-mix(in oklab, var(--danger) 14%, transparent)", fg: "var(--danger)" },
  archived:  { bg: "var(--surface-2)", fg: "var(--fg-muted)" },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.available;
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        padding: "2px 7px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}
