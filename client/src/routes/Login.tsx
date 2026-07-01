import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import { apiFetch } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? "Erreur de connexion");
        return;
      }

      const data = await res.json();
      setTokens(data.access_token, data.refresh_token);
      navigate("/notebook", { replace: true });
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-sm rounded-lg p-8"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--fg)" }}>
          HHGL Lab
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
          Connecte-toi pour accéder à l'application.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="rounded px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--fg)",
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--fg)",
              }}
            />
          </div>

          {error && (
            <p className="text-xs rounded px-3 py-2" style={{ background: "color-mix(in oklab, var(--danger) 10%, transparent)", color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ background: loading ? "var(--fg-subtle)" : "var(--primary)", cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
