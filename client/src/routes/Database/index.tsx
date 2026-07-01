import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { RESOURCE_CONFIGS, RESOURCE_KEYS, ResourceKey } from "./config";
import { listResource, getResource } from "../../api/database";
import CategoryRail from "./CategoryRail";
import ResourceTable from "./ResourceTable";
import DetailPanel from "./DetailPanel";
import BoxView from "./BoxView";

export default function DatabasePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeResource, setActiveResource] = useState<ResourceKey>(() => {
    const t = searchParams.get("type") as ResourceKey | null;
    return t && RESOURCE_KEYS.includes(t) ? t : "plasmids";
  });
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("id"));
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "box">("table");
  const [primerCategory, setPrimerCategory] = useState<string | null>(null);

  // React to URL params — handles both initial load and chip clicks when already on this page
  const typeParam = searchParams.get("type");
  const idParam = searchParams.get("id");
  useEffect(() => {
    if (!typeParam && !idParam) return;
    if (typeParam && RESOURCE_KEYS.includes(typeParam as ResourceKey)) {
      setActiveResource(typeParam as ResourceKey);
    }
    if (idParam) {
      setSelectedId(idParam);
      setIsCreating(false);
    }
    setSearchParams({}, { replace: true });
  }, [typeParam, idParam]);

  const config = RESOURCE_CONFIGS[activeResource];

  // Liste de la ressource active
  const listQuery = useQuery({
    queryKey: ["db", activeResource, searchQuery],
    queryFn: () => listResource(config.apiPath, { q: searchQuery, limit: "200" }),
    staleTime: 30_000,
  });

  // Détail de l'élément sélectionné
  const detailQuery = useQuery({
    queryKey: ["db-item", activeResource, selectedId],
    queryFn: () => getResource(config.apiPath, selectedId!),
    enabled: !!selectedId && !isCreating,
  });

  // Compteurs par catégorie (fetch léger)
  const countsQuery = useQuery({
    queryKey: ["db-counts"],
    queryFn: async () => {
      const results = await Promise.all(
        RESOURCE_KEYS.map((k) =>
          listResource(RESOURCE_CONFIGS[k].apiPath, { limit: "200" }).then((r) => [k, r.length] as const)
        )
      );
      return Object.fromEntries(results) as Partial<Record<ResourceKey, number>>;
    },
    staleTime: 60_000,
  });

  function handleSelectResource(key: ResourceKey) {
    setActiveResource(key);
    setSelectedId(null);
    setIsCreating(false);
    setSearchQuery("");
    setPrimerCategory(null);
  }

  function handleSelectRow(id: string) {
    setSelectedId(id);
    setIsCreating(false);
  }

  function handleNew() {
    setSelectedId(null);
    setIsCreating(true);
  }

  function handleClosePanel() {
    setSelectedId(null);
    setIsCreating(false);
  }

  function handleNavigateFromBox(type: ResourceKey, id: string) {
    setViewMode("table");
    setActiveResource(type);
    setSelectedId(id);
    setIsCreating(false);
  }

  const allRows = (listQuery.data ?? []) as Record<string, unknown>[];
  const primerCategories = activeResource === "primers"
    ? Array.from(new Set(allRows.map((r) => r.category as string | null).filter(Boolean))) as string[]
    : [];
  const rows = activeResource === "primers" && primerCategory
    ? allRows.filter((r) => r.category === primerCategory)
    : allRows;
  const selectedItem = detailQuery.data as Record<string, unknown> | null ?? null;
  const showPanel = isCreating || selectedId != null;

  return (
    <div className="flex h-full" style={{ background: "var(--bg)" }}>
      <CategoryRail
        active={activeResource}
        counts={countsQuery.data ?? {}}
        onChange={handleSelectResource}
        viewMode={viewMode}
        onViewMode={setViewMode}
      />

      {viewMode === "box" ? (
        <BoxView onNavigate={handleNavigateFromBox} />
      ) : (
        <>
          <div className="flex flex-col flex-1 min-w-0" style={{ borderRight: "1px solid var(--border)" }}>
            {activeResource === "primers" && primerCategories.length > 0 && (
              <div style={{ display: "flex", gap: 6, padding: "7px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexWrap: "wrap" }}>
                {[null, ...primerCategories].map((cat) => (
                  <button
                    key={String(cat)}
                    onClick={() => setPrimerCategory(cat)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 5,
                      border: "1px solid", cursor: "pointer",
                      background: primerCategory === cat ? "color-mix(in srgb, #6366f1 20%, transparent)" : "transparent",
                      color: primerCategory === cat ? "#a5b4fc" : "var(--fg-muted)",
                      borderColor: primerCategory === cat ? "color-mix(in srgb, #6366f1 40%, transparent)" : "var(--border)",
                    }}
                  >
                    {cat ?? "Tous"}
                  </button>
                ))}
              </div>
            )}
            <ResourceTable
              columns={config.columns}
              rows={rows}
              selectedId={selectedId}
              onSelect={handleSelectRow}
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              onNew={handleNew}
              isLoading={listQuery.isLoading}
              noBorder
            />
          </div>

          {showPanel && (
            <DetailPanel
              resourceKey={activeResource}
              apiPath={config.apiPath}
              item={selectedItem}
              fields={config.fields}
              isCreating={isCreating}
              onClose={handleClosePanel}
            />
          )}
        </>
      )}
    </div>
  );
}
