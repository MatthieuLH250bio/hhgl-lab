import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../api/client";

interface SearchResult {
  id: string;
  category: string;
  color: string;
  label: string;
  sublabel: string;
  path: string;
}

const PATH_LABEL: Record<string, string> = {
  "/database":    "Base de données",
  "/notebook":    "Cahier",
  "/protocols":   "Protocoles",
  "/bibliography":"Bibliographie",
};

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debQ, setDebQ] = useState("");
  const [sel, setSel] = useState(0);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebQ(query), 280);
    return () => clearTimeout(t);
  }, [query]);

  // Reset + focus on open
  useEffect(() => {
    if (open) {
      setQuery(""); setDebQ(""); setSel(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const { data, isFetching } = useQuery<{ results: SearchResult[] }>({
    queryKey: ["search", debQ],
    queryFn: () =>
      apiFetch(`/api/search?q=${encodeURIComponent(debQ)}`).then((r) => r.json()),
    enabled: debQ.length >= 1,
    staleTime: 15_000,
  });

  const results = data?.results ?? [];

  // Build groups + flat index in one pass
  const groups: { category: string; color: string; items: { result: SearchResult; idx: number }[] }[] = [];
  results.forEach((result, idx) => {
    const g = groups.find((x) => x.category === result.category);
    if (g) g.items.push({ result, idx });
    else groups.push({ category: result.category, color: result.color, items: [{ result, idx }] });
  });

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => Math.min(s + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter" && results[sel]) {
        navigate(results[sel].path);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sel, results, navigate, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ paddingTop: "10vh", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full flex flex-col rounded-xl overflow-hidden"
        style={{
          maxWidth: 560,
          maxHeight: "72vh",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Search input ────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="var(--fg-subtle)" strokeWidth="1.4" />
            <path d="M10 10L13.5 13.5" stroke="var(--fg-subtle)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSel(0); }}
            placeholder="Rechercher dans HHGL Lab…"
            className="flex-1 py-4 text-sm"
            style={{ background: "transparent", border: "none", color: "var(--fg)", outline: "none" }}
          />
          {isFetching && (
            <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>…</span>
          )}
          <kbd
            className="text-xs px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--fg-subtle)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Esc
          </kbd>
        </div>

        {/* ── Results ─────────────────────────────────────────────────── */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {!query && (
            <div className="px-5 py-10 text-center">
              <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                Tapez pour rechercher dans toutes les données du labo.
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--fg-subtle)", opacity: 0.6 }}>
                Ressources · Cahier · Protocoles · Bibliographie
              </p>
            </div>
          )}

          {query && debQ && !isFetching && results.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                Aucun résultat pour «&nbsp;{query}&nbsp;»
              </p>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.category}>
              {/* Category header */}
              <div
                className="px-4 py-1.5 flex items-center gap-2 sticky top-0"
                style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}
              >
                <span
                  style={{ width: 6, height: 6, borderRadius: "50%", background: group.color, flexShrink: 0 }}
                />
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  {group.category}
                </span>
              </div>

              {/* Items */}
              {group.items.map(({ result, idx }) => {
                const active = idx === sel;
                return (
                  <button
                    key={result.id}
                    data-idx={idx}
                    onClick={() => { navigate(result.path); onClose(); }}
                    onMouseEnter={() => setSel(idx)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-left"
                    style={{
                      background: active ? "var(--primary-soft)" : "transparent",
                      border: "none",
                      borderLeft: `2px solid ${active ? group.color : "transparent"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm truncate"
                        style={{ color: active ? "var(--fg)" : "var(--fg-muted)", fontWeight: active ? 500 : 400 }}
                      >
                        {result.label}
                      </p>
                      {result.sublabel && (
                        <p className="text-xs truncate mt-0.5" style={{ color: "var(--fg-subtle)" }}>
                          {result.sublabel}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-xs shrink-0 rounded px-1.5 py-0.5"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: "var(--fg-subtle)",
                      }}
                    >
                      {PATH_LABEL[result.path] ?? result.path}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-4 px-4 py-2 shrink-0 text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--fg-subtle)" }}
        >
          <span>↑↓ Naviguer</span>
          <span>↵ Ouvrir</span>
          <span>Esc Fermer</span>
          {results.length > 0 && (
            <span className="ml-auto">
              {results.length} résultat{results.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
