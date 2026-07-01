import { NavLink } from "react-router-dom";
import { useUiStore } from "../../stores/ui";
import { useServerStatus } from "../../hooks/useServerStatus";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../api/client";

const toolItems = [
  { to: "/tools/plasmid",     label: "Plasmid Studio" },
  { to: "/tools/calculators", label: "Outils de calcul" },
  { to: "/tools/gel",         label: "Simulateur de gel" },
  { to: "/tools/alignment",   label: "Alignement" },
  { to: "/tools/platemap",    label: "Plate map" },
  { to: "/tools/qpcr",        label: "qPCR ΔΔCt" },
  { to: "/tools/growth",      label: "Courbe de croissance" },
  { to: "/tools/restriction", label: "Carte de restriction" },
  { to: "/tools/stats",       label: "Stats" },
];

function navStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 10px",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: isActive ? 600 : 400,
    background: isActive ? "var(--primary-soft)" : "transparent",
    color: isActive ? "var(--primary)" : "var(--fg-muted)",
    textDecoration: "none",
    transition: "background 0.1s",
  };
}

export default function Sidebar() {
  const { sidebarCollapsed } = useUiStore();

  const serverStatus = useServerStatus();

  const { data } = useQuery<{ counts: { entries: number; protocols: number; plasmids: number; strains: number; cell_lines: number; primers: number; antibodies: number; viruses: number } }>({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/api/dashboard").then((r) => r.json()),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const dbCount = data
    ? data.counts.plasmids + data.counts.strains + data.counts.cell_lines +
      data.counts.primers + data.counts.antibodies + data.counts.viruses
    : null;

  const workspaceItems = [
    { to: "/notebook",     label: "Cahier de labo",  count: data?.counts.entries ?? null },
    { to: "/database",     label: "Base de données", count: dbCount },
    { to: "/protocols",    label: "Protocoles",      count: data?.counts.protocols ?? null },
    { to: "/bibliography", label: "Bibliographie",   count: null },
  ];

  const width = sidebarCollapsed ? 48 : 200;

  return (
    <aside
      style={{
        width,
        minWidth: width,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s",
        overflow: "hidden",
      }}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">

        {/* Workspace */}
        {!sidebarCollapsed && (
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-subtle)", letterSpacing: "0.1em" }}>
            Workspace
          </p>
        )}
        {workspaceItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => navStyle(isActive)}
          >
            {sidebarCollapsed ? (
              <span title={item.label} style={{ fontSize: 13 }}>{item.label.charAt(0)}</span>
            ) : (
              <>
                <span>{item.label}</span>
                {item.count !== null && (
                  <span className="text-xs" style={{ color: "var(--fg-subtle)", fontVariantNumeric: "tabular-nums" }}>
                    {item.count.toLocaleString("fr-FR")}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Tools */}
        <div className="mt-4">
          {!sidebarCollapsed && (
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-subtle)", letterSpacing: "0.1em" }}>
              Tools
            </p>
          )}
          {toolItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => navStyle(isActive)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {sidebarCollapsed ? item.label.charAt(0) : item.label}
            </NavLink>
          ))}
        </div>

        {/* Settings */}
        <div className="mt-4">
          <NavLink
            to="/settings"
            style={({ isActive }) => navStyle(isActive)}
            title={sidebarCollapsed ? "Paramètres" : undefined}
          >
            {sidebarCollapsed ? "⚙" : "Paramètres"}
          </NavLink>
        </div>
      </nav>

      {/* Server status */}
      <div
        className="px-3 py-2.5 shrink-0 flex items-center gap-2"
        style={{ borderTop: "1px solid var(--border)" }}
        title={
          serverStatus === "online" ? "Serveur connecté" :
          serverStatus === "offline" ? "Serveur hors ligne" : "Vérification…"
        }
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            flexShrink: 0,
            background:
              serverStatus === "online"  ? "var(--success, #22c55e)" :
              serverStatus === "offline" ? "var(--danger, #ef4444)" :
              "var(--fg-subtle, #aaa)",
            boxShadow: serverStatus === "online"
              ? "0 0 0 2px color-mix(in oklab, var(--success, #22c55e) 30%, transparent)"
              : "none",
          }}
        />
        {!sidebarCollapsed && (
          <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
            {serverStatus === "online"  ? "Local server · synced" :
             serverStatus === "offline" ? "Hors ligne" :
             "Connexion…"}
          </span>
        )}
      </div>
    </aside>
  );
}
