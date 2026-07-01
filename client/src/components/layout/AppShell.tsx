import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import GlobalSearch from "../GlobalSearch";
import Toaster from "../Toaster";
import ExportConfirmModal from "../ui/ExportConfirmModal";
import Logo from "../ui/Logo";
import { useUiStore } from "../../stores/ui";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../api/users";
import { useServerStatus } from "../../hooks/useServerStatus";

function TopBar({ onSearchOpen }: { onSearchOpen: () => void }) {
  const { theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    staleTime: 5 * 60_000,
  });

  const initials = (() => {
    const name = meQuery.data?.full_name ?? meQuery.data?.username ?? "";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  return (
    <div
      data-no-print
      className="flex items-center gap-3 px-4 shrink-0"
      style={{
        height: 46,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        zIndex: 10,
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0" style={{ width: "var(--sidebar-w, 200px)" }}>
        <Logo size={24} />
        <span className="font-semibold text-sm" style={{ color: "var(--fg)" }}>HHGL</span>
      </div>

      {/* Search */}
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 rounded px-3 py-1.5 text-sm flex-1"
        style={{
          maxWidth: 360,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--fg-subtle)",
          cursor: "pointer",
          justifyContent: "space-between",
        }}
      >
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Recherche globale…
        </span>
        <kbd
          className="text-xs px-1 py-0.5 rounded"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 10 }}
        >
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold"
          style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer" }}
          onClick={() => navigate("/notebook")}
        >
          + Nouveau
        </button>

        <button
          onClick={toggleTheme}
          className="rounded p-1.5 text-sm"
          style={{ background: "transparent", border: "none", color: "var(--fg-muted)", cursor: "pointer" }}
          title={theme === "light" ? "Mode sombre" : "Mode clair"}
        >
          {theme === "light" ? "◑" : "☀"}
        </button>

        <NavLink
          to="/settings"
          className="rounded p-1.5"
          style={{ color: "var(--fg-muted)", display: "flex", alignItems: "center" }}
          title="Paramètres"
        >
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 1a6.5 6.5 0 100 13A6.5 6.5 0 007.5 1zm0 11a4.5 4.5 0 110-9 4.5 4.5 0 010 9z" fill="currentColor" opacity=".2"/>
            <circle cx="7.5" cy="7.5" r="2" fill="currentColor"/>
          </svg>
        </NavLink>

        <NavLink
          to="/settings"
          className="flex items-center justify-center rounded-full text-xs font-bold"
          style={{ width: 28, height: 28, background: "var(--primary)", color: "#fff", flexShrink: 0 }}
          title="Mon profil"
        >
          {initials || "?"}
        </NavLink>
      </div>
    </div>
  );
}

function OfflineBanner() {
  const status = useServerStatus(30_000);
  if (status !== "offline") return null;
  return (
    <div
      data-no-print
      className="flex items-center justify-center gap-2 px-4 py-1.5 shrink-0 text-xs font-medium"
      style={{
        background: "color-mix(in oklab, #F59E0B 15%, transparent)",
        borderBottom: "1px solid color-mix(in oklab, #F59E0B 35%, transparent)",
        color: "#92400E",
      }}
    >
      <span style={{ fontSize: 10 }}>⚠</span>
      Serveur non disponible · données en cache affichées
    </div>
  );
}

export default function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full" style={{ background: "var(--bg)" }}>
      <TopBar onSearchOpen={() => setSearchOpen(true)} />
      <OfflineBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto" style={{ background: "var(--bg)" }}>
          <Outlet />
        </main>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toaster />
      <ExportConfirmModal />
    </div>
  );
}
