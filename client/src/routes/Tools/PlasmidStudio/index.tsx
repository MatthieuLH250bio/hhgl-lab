import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listResource, getResource, deleteResource } from "../../../api/database";
import type { Plasmid } from "../../../types/database";
import PlasmidMap from "./PlasmidMap";
import FeaturePanel from "./FeaturePanel";
import PlasmidForm from "./PlasmidForm";
import { parseGenBank, type ParsedPlasmid } from "./parseGenbank";

type Mode = "view" | "create" | "edit";

export default function PlasmidStudioPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [search, setSearch] = useState("");
  const [importData, setImportData] = useState<ParsedPlasmid | undefined>();
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: plasmids = [] } = useQuery({
    queryKey: ["plasmids"],
    queryFn: () => listResource("plasmids", {}) as Promise<Plasmid[]>,
    staleTime: 30_000,
  });

  const { data: plasmid, isLoading: loadingPlasmid } = useQuery({
    queryKey: ["plasmid", selectedId],
    queryFn: () => getResource("plasmids", selectedId!) as Promise<Plasmid>,
    enabled: !!selectedId && mode === "view",
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteResource("plasmids", selectedId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plasmids"] });
      setSelectedId(null);
      setMode("view");
    },
  });

  const filtered = plasmids.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(id: string) {
    setSelectedId(id);
    setMode("view");
  }

  function handleNew() {
    setImportData(undefined);
    setSelectedId(null);
    setMode("create");
  }

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseGenBank(text);
        setImportData(parsed);
        setSelectedId(null);
        setMode("create");
        setImportError(null);
      } catch {
        setImportError("Impossible de lire ce fichier. Vérifie qu'il est au format GenBank (.gb / .gbk).");
      }
    };
    reader.readAsText(file);
  }

  function handleSaved(id: string) {
    setImportData(undefined);
    setSelectedId(id);
    setMode("view");
  }

  function handleCancel() {
    setImportData(undefined);
    setMode("view");
  }

  function handleDelete() {
    if (confirm(`Supprimer "${plasmid?.name}" définitivement ?`)) {
      deleteMut.mutate();
    }
  }

  return (
    <div className="flex h-full" style={{ background: "var(--bg)" }}>
      {/* ── Left panel — plasmid list ─────────────────────────────────── */}
      <div
        className="flex flex-col shrink-0"
        style={{
          width: 280,
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          className="px-4 pt-4 pb-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {/* Hidden file input for GenBank import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".gb,.gbk,.ape"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
                Plasmid Studio
              </h2>
              <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                {plasmids.length} plasmide{plasmids.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleImportClick}
                className="rounded px-2.5 py-1.5 text-xs font-medium"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--fg-muted)",
                  cursor: "pointer",
                }}
                title="Importer un fichier GenBank (.gb, .gbk)"
              >
                ↑ .gb
              </button>
              <button
                onClick={handleNew}
                className="rounded px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                + Nouveau
              </button>
            </div>
          </div>

          {importError && (
            <p
              className="text-xs rounded px-2 py-1.5 mb-2"
              style={{
                background: "color-mix(in oklab,var(--danger) 10%,transparent)",
                color: "var(--danger)",
              }}
            >
              {importError}
            </p>
          )}
          <input
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              padding: "5px 10px",
              fontSize: 12,
              color: "var(--fg)",
              outline: "none",
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                {plasmids.length === 0
                  ? "Aucun plasmide dans la base."
                  : "Aucun résultat."}
              </p>
              {plasmids.length === 0 && (
                <button
                  onClick={handleNew}
                  className="mt-3 text-xs rounded px-3 py-1.5 font-medium"
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Créer le premier
                </button>
              )}
            </div>
          )}
          {filtered.map((p) => {
            const isSelected = p.id === selectedId;
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className="w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors"
                style={{
                  background: isSelected ? "var(--primary-soft)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: isSelected
                    ? "3px solid var(--primary)"
                    : "3px solid transparent",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--fg-subtle)",
                    }}
                  >
                    {p.code}
                  </span>
                  {(p as Plasmid).length_bp && (
                    <span className="text-xs shrink-0" style={{ color: "var(--fg-subtle)" }}>
                      {(p as Plasmid).length_bp!.toLocaleString("fr-FR")} bp
                    </span>
                  )}
                </div>
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: isSelected ? "var(--primary)" : "var(--fg)" }}
                >
                  {p.name}
                </p>
                {(p as Plasmid).backbone && (
                  <p className="text-xs truncate" style={{ color: "var(--fg-subtle)" }}>
                    {(p as Plasmid).backbone}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">

        {/* Create or Edit form */}
        {(mode === "create" || mode === "edit") && (
          <PlasmidForm
            plasmid={mode === "edit" ? plasmid : undefined}
            imported={mode === "create" ? importData : undefined}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        )}

        {/* View mode */}
        {mode === "view" && (
          <>
            {!selectedId && (
              <div className="flex-1 flex items-center justify-center flex-col gap-3">
                <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                  Sélectionnez un plasmide ou créez-en un nouveau.
                </p>
                <button
                  onClick={handleNew}
                  className="rounded px-4 py-2 text-sm font-semibold"
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  + Nouveau plasmide
                </button>
              </div>
            )}

            {selectedId && loadingPlasmid && (
              <div
                className="flex-1 flex items-center justify-center text-sm"
                style={{ color: "var(--fg-muted)" }}
              >
                Chargement…
              </div>
            )}

            {selectedId && !loadingPlasmid && plasmid && (
              <>
                {/* Header */}
                <div
                  className="px-8 py-4 shrink-0"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <span
                        className="text-xs shrink-0"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--fg-subtle)",
                        }}
                      >
                        {plasmid.code}
                      </span>
                      <h1
                        className="text-lg font-bold truncate"
                        style={{ color: "var(--fg)" }}
                      >
                        {plasmid.name}
                      </h1>
                      {plasmid.length_bp && (
                        <span
                          className="text-xs rounded px-2 py-0.5 shrink-0"
                          style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            color: "var(--fg-muted)",
                          }}
                        >
                          {plasmid.length_bp.toLocaleString("fr-FR")} bp
                        </span>
                      )}
                      {plasmid.backbone && (
                        <span
                          className="text-xs rounded px-2 py-0.5 shrink-0"
                          style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            color: "var(--fg-muted)",
                          }}
                        >
                          {plasmid.backbone}
                        </span>
                      )}
                      {plasmid.resistance && plasmid.resistance.length > 0 && (
                        <span
                          className="text-xs rounded px-2 py-0.5 shrink-0"
                          style={{
                            background:
                              "color-mix(in oklab,#EF4444 10%,transparent)",
                            border:
                              "1px solid color-mix(in oklab,#EF4444 25%,transparent)",
                            color: "#EF4444",
                          }}
                        >
                          {plasmid.resistance.join(", ")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setMode("edit")}
                        className="rounded px-3 py-1 text-xs font-medium"
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          color: "var(--fg)",
                          cursor: "pointer",
                        }}
                      >
                        Éditer
                      </button>
                      <button
                        onClick={handleDelete}
                        className="rounded px-3 py-1 text-xs font-medium"
                        style={{
                          background: "transparent",
                          border: "1px solid var(--danger)",
                          color: "var(--danger)",
                          cursor: "pointer",
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Map + features */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  <div
                    className="flex gap-8 items-start flex-wrap"
                    style={{ maxWidth: 920 }}
                  >
                    <PlasmidMap plasmid={plasmid} />
                    <FeaturePanel
                      features={plasmid.features ?? []}
                      totalBp={plasmid.length_bp ?? 0}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
