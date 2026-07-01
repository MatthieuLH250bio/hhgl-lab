import { useToastStore, type ToastType } from "../stores/toast";

const STYLES: Record<ToastType, { bg: string; border: string; dot: string; icon: string }> = {
  success: {
    bg: "color-mix(in oklab, var(--success) 8%, var(--surface))",
    border: "color-mix(in oklab, var(--success) 35%, transparent)",
    dot: "var(--success)",
    icon: "✓",
  },
  error: {
    bg: "color-mix(in oklab, var(--danger) 8%, var(--surface))",
    border: "color-mix(in oklab, var(--danger) 35%, transparent)",
    dot: "var(--danger)",
    icon: "✕",
  },
  info: {
    bg: "var(--surface)",
    border: "var(--border)",
    dot: "var(--fg-muted)",
    icon: "i",
  },
};

export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const s = STYLES[t.type];
        return (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className="toast-item"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: "var(--radius, 4px)",
              background: s.bg,
              border: `1px solid ${s.border}`,
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              minWidth: 220,
              maxWidth: 360,
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: s.dot,
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {s.icon}
            </span>
            <span style={{ fontSize: 13, color: "var(--fg)", flex: 1, lineHeight: 1.4 }}>
              {t.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}
