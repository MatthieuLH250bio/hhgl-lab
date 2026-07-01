import { Component, type ErrorInfo, type ReactNode } from "react";
import { logError } from "../lib/errorLogger";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(error, "render");
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: 32,
            background: "var(--bg, #f6f5f1)",
            fontFamily: "Inter, sans-serif",
            gap: 16,
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: "100%",
              background: "var(--surface, #fffdf8)",
              border: "1px solid var(--border, #e0ddd4)",
              borderRadius: 8,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg, #1a1916)", margin: 0 }}>
                Erreur inattendue
              </h2>
            </div>

            <p style={{ fontSize: 13, color: "var(--fg-muted, #6b6960)", margin: 0 }}>
              Un screenshot et un log ont été capturés automatiquement. Consultez l'onglet
              <strong> Logs</strong> dans les Paramètres pour les détails.
            </p>

            <pre
              style={{
                fontSize: 11,
                background: "var(--surface-2, #efece4)",
                border: "1px solid var(--border, #e0ddd4)",
                borderRadius: 4,
                padding: "8px 12px",
                overflow: "auto",
                maxHeight: 160,
                color: "var(--fg-muted, #6b6960)",
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {this.state.error?.message}
            </pre>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{
                  padding: "6px 14px",
                  background: "var(--surface-2, #efece4)",
                  border: "1px solid var(--border, #e0ddd4)",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--fg-muted, #6b6960)",
                }}
              >
                Réessayer
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
                style={{
                  padding: "6px 14px",
                  background: "var(--primary, #1e497a)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
