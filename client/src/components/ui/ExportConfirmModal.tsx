import { useExportConfirmStore } from "../../stores/exportConfirm";

export default function ExportConfirmModal() {
  const { pending, resolve } = useExportConfirmStore();

  if (!pending) return null;

  const ext = pending.filename.split(".").pop()?.toUpperCase() ?? "FILE";
  const isCSV = ext === "CSV";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(2px)",
      }}
      onClick={() => resolve(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "24px 28px",
          width: 340,
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: isCSV
                ? "color-mix(in oklab, #22c55e 15%, transparent)"
                : "color-mix(in oklab, var(--primary) 15%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {isCSV ? "📊" : "🖼"}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
              Exporter le fichier
            </p>
            <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
              Confirme avant de sauvegarder
            </p>
          </div>
        </div>

        {/* File info */}
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>Fichier</span>
            <span
              className="text-xs font-semibold truncate"
              style={{ color: "var(--fg)", fontFamily: "var(--font-mono)", maxWidth: 200 }}
            >
              {pending.filename}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs shrink-0" style={{ color: "var(--fg-subtle)" }}>Destination</span>
            <span
              className="text-xs text-right"
              style={{ color: "var(--fg-muted)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}
            >
              {pending.destLabel}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => resolve(false)}
            style={{
              padding: "6px 16px",
              borderRadius: 5,
              fontSize: 13,
              background: "var(--surface-2)",
              color: "var(--fg-muted)",
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => resolve(true)}
            style={{
              padding: "6px 16px",
              borderRadius: 5,
              fontSize: 13,
              fontWeight: 600,
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            ✓ Exporter
          </button>
        </div>
      </div>
    </div>
  );
}
