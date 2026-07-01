import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listReferences } from "../../api/bibliography";
import CollectionTree from "./CollectionTree";
import ReferenceList from "./ReferenceList";
import ReferenceDetail from "./ReferenceDetail";

type Mode = "view" | "edit" | "create";

export default function BibliographyPage() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedRefId, setSelectedRefId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [searchQuery, setSearchQuery] = useState("");

  const listQuery = useQuery({
    queryKey: ["references", searchQuery, selectedCollectionId],
    queryFn: () => listReferences(searchQuery, selectedCollectionId),
    staleTime: 30_000,
  });

  const refs = listQuery.data ?? [];
  const showPanel = selectedRefId != null || mode === "create";

  function handleSelectRef(id: string) {
    setSelectedRefId(id);
    setMode("view");
  }

  function handleNew() {
    setSelectedRefId(null);
    setMode("create");
  }

  function handleCollectionChange(id: string | null) {
    setSelectedCollectionId(id);
    setSelectedRefId(null);
    setMode("view");
  }

  function handleSaved(id: string) {
    setSelectedRefId(id);
    setMode("view");
  }

  function handleDeleted() {
    setSelectedRefId(null);
    setMode("view");
  }

  function handleClose() {
    setSelectedRefId(null);
    setMode("view");
  }

  return (
    <div className="flex h-full" style={{ background: "var(--bg)" }}>
      {/* Column 1 — folder tree */}
      <CollectionTree selectedId={selectedCollectionId} onChange={handleCollectionChange} />

      {/* Column 2 — reference list */}
      <ReferenceList
        refs={refs}
        selectedId={selectedRefId}
        isLoading={listQuery.isLoading}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onSelect={handleSelectRef}
        onNew={handleNew}
      />

      {/* Column 3 — detail / editor */}
      {showPanel ? (
        <ReferenceDetail
          refId={selectedRefId}
          mode={mode}
          onModeChange={setMode}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={handleClose}
          defaultCollectionId={selectedCollectionId}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: "var(--fg-subtle)" }}>
          <span style={{ fontSize: 32 }}>📚</span>
          <p className="text-sm">Sélectionne une référence ou crée-en une nouvelle</p>
          <button
            onClick={handleNew}
            className="rounded px-4 py-2 text-sm font-medium mt-1"
            style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer" }}
          >
            + Nouvelle référence
          </button>
        </div>
      )}
    </div>
  );
}
