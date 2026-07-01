import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { getEntry } from "../../api/notebook";
import ProjectTree from "./ProjectTree";
import EntryList from "./EntryList";
import EntryReader from "./EntryReader";
import EntryEditor from "./EntryEditor";

interface AnyTemplate {
  id?: string;
  code?: string;
  title: string;
  body_html: string | null;
}

export default function NotebookPage() {
  const location = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const state = location.state as { fromProtocol?: AnyTemplate; fromTool?: AnyTemplate } | null;
  const [template, setTemplate] = useState<AnyTemplate | null>(
    state?.fromProtocol ?? state?.fromTool ?? null
  );

  const entryQuery = useQuery({
    queryKey: ["entry", selectedEntryId],
    queryFn: () => getEntry(selectedEntryId!),
    enabled: !!selectedEntryId,
    staleTime: 15_000,
  });

  function handleSelectExperiment(projectId: string, expId: string) {
    setSelectedProjectId(projectId);
    setSelectedExperimentId(expId);
    setSelectedEntryId(null);
    setIsEditing(false);
  }

  function handleSelectEntry(id: string) {
    setSelectedEntryId(id);
    setIsEditing(false);
  }

  function handleDeleted() {
    setSelectedEntryId(null);
    setIsEditing(false);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Template banner */}
      {template && (
        <div
          className="flex items-center justify-between gap-3 px-5 py-2 shrink-0"
          style={{
            background: "color-mix(in oklab, #EAB308 10%, transparent)",
            borderBottom: "1px solid color-mix(in oklab, #EAB308 30%, transparent)",
          }}
        >
          <span className="text-xs font-medium" style={{ color: "#92400E" }}>
            {template.code
              ? <><strong>Template · {template.code}</strong> {template.title}</>
              : <><strong>Outil ·</strong> {template.title}</>
            }{" "}— Choisissez une expérience puis cliquez + pour créer l'entrée
          </span>
          <button
            onClick={() => setTemplate(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#92400E", fontSize: 14 }}
            title="Annuler le template"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div data-no-print style={{ display: "contents" }}>
          <ProjectTree
            selectedProjectId={selectedProjectId}
            selectedExperimentId={selectedExperimentId}
            onSelectExperiment={handleSelectExperiment}
          />
        </div>

        <div data-no-print style={{ display: "contents" }}>
          <EntryList
            experimentId={selectedExperimentId}
            selectedEntryId={selectedEntryId}
            onSelect={handleSelectEntry}
            template={template}
            onCreatedFromTemplate={(id) => {
              setTemplate(null);
              setSelectedEntryId(id);
              setIsEditing(true);
            }}
          />
        </div>

        <div className="flex flex-1 min-w-0 h-full overflow-hidden">
          {selectedEntryId && isEditing && entryQuery.data ? (
            <EntryEditor
              entry={entryQuery.data}
              experimentId={selectedExperimentId!}
              onClose={() => setIsEditing(false)}
            />
          ) : selectedEntryId ? (
            <EntryReader
              entryId={selectedEntryId}
              experimentId={selectedExperimentId!}
              onEdit={() => setIsEditing(true)}
              onDeleted={handleDeleted}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-2" style={{ color: "var(--fg-subtle)" }}>
              <p className="text-sm">Sélectionne une entrée pour la lire</p>
              {!template && <p className="text-xs">ou clique + dans la liste pour en créer une</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
