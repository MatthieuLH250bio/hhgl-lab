import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/client";
import { getMe } from "../../api/users";
import Logo from "../../components/ui/Logo";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  counts: {
    plasmids: number; strains: number; cell_lines: number;
    primers: number; antibodies: number; viruses: number;
    entries: number; protocols: number; references: number;
  };
  recent_entries: {
    id: string; code: string; title: string; entry_date: string;
    tags: string[]; experiment_title: string; project_name: string; project_color: string;
  }[];
  recent_protocols: {
    id: string; code: string; title: string; category: string | null; updated_at: string;
  }[];
  recent_references: {
    id: string; title: string; authors: string[]; journal: string | null;
    year: number | null; created_at: string;
  }[];
  recent_items: {
    id: string; code: string; name: string;
    category: string; color: string; created_at: string;
  }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  60) return `${mins || 1}min`;
  if (hours <  24) return `${hours}h`;
  if (days  ===  1) return "hier";
  if (days  <   7) return `${days}j`;
  if (days  <  30) return `${Math.floor(days / 7)}sem`;
  return `${Math.floor(days / 30)}mois`;
}

// ── Module cards ──────────────────────────────────────────────────────────────

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  count: number | null;
  countLabel: string;
  to: string;
}

function ModuleCard({ icon, title, description, badge, badgeColor, count, countLabel, to }: ModuleCardProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex flex-col gap-3 rounded-xl p-5 text-left"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ width: 40, height: 40, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", fontSize: 18 }}
      >
        {icon}
      </div>

      {/* Title + description */}
      <div>
        <p className="font-semibold text-sm" style={{ color: "var(--fg)" }}>{title}</p>
        <p className="text-xs mt-1" style={{ color: "var(--fg-muted)", lineHeight: 1.5 }}>{description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ background: badgeColor + "1a", color: badgeColor, border: `1px solid ${badgeColor}33` }}
        >
          {badge}
        </span>
        {count !== null && (
          <span className="text-xs" style={{ color: "var(--fg-subtle)", fontVariantNumeric: "tabular-nums" }}>
            {count.toLocaleString("fr-FR")} {countLabel}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/api/dashboard").then((r) => r.json()),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    staleTime: 5 * 60_000,
  });

  const firstName = (meQuery.data?.full_name ?? meQuery.data?.username ?? "").split(" ")[0].toUpperCase();

  const dbCount = data
    ? data.counts.plasmids + data.counts.strains + data.counts.cell_lines +
      data.counts.primers + data.counts.antibodies + data.counts.viruses
    : null;

  // Combine recent items for the panel
  const recentItems = data?.recent_items ?? [];

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="flex flex-col gap-8 px-10 py-10" style={{ maxWidth: 900, width: "100%", margin: "0 auto" }}>

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <Logo size={88} />
          {firstName && (
            <p className="text-xs font-semibold uppercase tracking-widest mt-4" style={{ color: "var(--fg-subtle)", letterSpacing: "0.15em" }}>
              Bonjour, {firstName}
            </p>
          )}
          <h1 className="font-bold" style={{ fontSize: 32, color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            The Hitchhiker's Guide to the Lab
          </h1>
          <p className="text-sm italic" style={{ color: "var(--fg-subtle)" }}>
            Don't panic. Just label your tubes.
          </p>
        </div>

        {/* ── Module cards 2×2 ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <ModuleCard
            icon={<span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>×</span>}
            title="Plasmid Studio"
            description="Visualisation, restriction, clonage Gibson & In-Fusion"
            badge="Bibliothèque"
            badgeColor="#3B82F6"
            count={data?.counts.plasmids ?? null}
            countLabel="plasmides"
            to="/tools/plasmid"
          />
          <ModuleCard
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            }
            title="Base de données"
            description="Échantillons, primers, anticorps, lignées cellulaires"
            badge="Inventaire & Box View"
            badgeColor="#A855F7"
            count={dbCount}
            countLabel="items"
            to="/database"
          />
          <ModuleCard
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 8h10M7 12h10M7 16h6" />
              </svg>
            }
            title="Protocoles"
            description="Éditeur markdown, fichiers et procédures versionnées"
            badge="Markdown & Fichiers"
            badgeColor="#EAB308"
            count={data?.counts.protocols ?? null}
            countLabel="protocoles"
            to="/protocols"
          />
          <ModuleCard
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
            }
            title="Cahier de labo"
            description="Notes d'expériences, calendrier et références croisées"
            badge="Calendrier & Notes"
            badgeColor="#6366F1"
            count={data?.counts.entries ?? null}
            countLabel="entrées"
            to="/notebook"
          />
        </div>

        {/* ── Outils de calcul banner ──────────────────────────────────── */}
        <button
          onClick={() => navigate("/tools/calculators")}
          className="flex items-center justify-between rounded-xl px-6 py-4 w-full text-left"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ width: 40, height: 40, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <path d="M8 6h8M8 10h8M8 14h4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--fg)" }}>Outils de calcul</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
                Dilution · Conversion ADN · Molarité · Mix PCR · Eff. transformation
              </p>
            </div>
          </div>
          <span
            className="rounded-lg px-4 py-2 text-sm font-semibold shrink-0"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            Ouvrir
          </span>
        </button>

        {/* ── Bottom row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Drag zone */}
          <button
            onClick={() => navigate("/tools/plasmid")}
            className="flex flex-col items-center justify-center gap-3 rounded-xl"
            style={{
              background: "var(--surface)",
              border: "1.5px dashed var(--border)",
              cursor: "pointer",
              minHeight: 140,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.4">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-medium" style={{ color: "var(--fg-muted)" }}>Glissez un fichier plasmide</p>
              <p className="text-xs" style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-mono)" }}>
                .gb · .gbk · .fasta · .fa
              </p>
            </div>
          </button>

          {/* Récents */}
          <div
            className="rounded-xl flex flex-col overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-subtle)", letterSpacing: "0.1em" }}>
                Récents
              </p>
            </div>
            <div className="flex flex-col flex-1">
              {recentItems.length === 0 && (
                <p className="px-4 py-3 text-xs" style={{ color: "var(--fg-subtle)" }}>Aucun élément récent</p>
              )}
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.category === "protocol") navigate("/protocols");
                    else navigate("/database");
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-left"
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  <span
                    className="text-xs font-semibold shrink-0"
                    style={{ fontFamily: "var(--font-mono)", color: item.color, minWidth: 64 }}
                  >
                    {item.code}
                  </span>
                  <span className="text-xs flex-1 truncate" style={{ color: "var(--fg)" }}>
                    {item.name}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: "var(--fg-subtle)" }}>
                    {relativeTime(item.created_at)}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
