import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProtocols } from "../../api/protocols";
import ProtocolList from "./ProtocolList";
import ProtocolDetail from "./ProtocolDetail";

type Mode = "view" | "edit" | "create";

export default function ProtocolsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: allProtocols = [], isLoading } = useQuery({
    queryKey: ["protocols", searchQuery, activeCategory],
    queryFn: () => listProtocols(searchQuery, activeCategory),
    staleTime: 15_000,
  });

  function handleSelect(id: string) {
    setSelectedId(id);
    setMode("view");
  }

  function handleNew() {
    setSelectedId(null);
    setMode("create");
  }

  function handleSaved(id: string) {
    setSelectedId(id);
    setMode("view");
  }

  function handleDeleted() {
    setSelectedId(null);
    setMode("view");
  }

  function handleClose() {
    setMode("view");
  }

  return (
    <div className="flex h-full" style={{ background: "var(--bg)" }}>
      <div data-no-print style={{ display: "contents" }}>
        <ProtocolList
          protocols={allProtocols}
          selectedId={selectedId}
          isLoading={isLoading}
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          onSearch={setSearchQuery}
          onCategoryChange={setActiveCategory}
          onSelect={handleSelect}
          onNew={handleNew}
        />
      </div>

      <div className="flex flex-1 min-w-0 h-full overflow-hidden">
        {mode === "view" && !selectedId ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3">
            <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>Sélectionnez un protocole ou créez-en un nouveau.</p>
            <button
              onClick={handleNew}
              className="rounded px-4 py-2 text-sm font-semibold"
              style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer" }}
            >
              + Nouveau protocole
            </button>
          </div>
        ) : (
          <ProtocolDetail
            protocolId={selectedId}
            mode={mode}
            onModeChange={setMode}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}
