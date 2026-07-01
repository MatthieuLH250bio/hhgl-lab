import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExperiment, createProject, deleteExperiment, deleteProject,
  listExperiments, listProjects, lockExperiment,
  type Experiment, type Project,
} from "../../api/notebook";
import { listUsers } from "../../api/users";
import { useAuthStore } from "../../stores/auth";

interface Props {
  selectedProjectId: string | null;
  selectedExperimentId: string | null;
  onSelectExperiment: (projectId: string, expId: string) => void;
}

function NewInlineForm({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (code: string, name: string) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--fg)",
    borderRadius: 4,
    fontSize: 11,
    padding: "3px 6px",
    outline: "none",
    width: "100%",
  };
  return (
    <div className="flex flex-col gap-1 px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <input
        autoFocus
        placeholder="Code (ex: P-001)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && code && name) onSubmit(code, name);
          if (e.key === "Escape") onCancel();
        }}
        style={inputStyle}
      />
      <div className="flex gap-1 justify-end">
        <button
          onClick={() => { if (code && name) onSubmit(code, name); }}
          style={{ fontSize: 10, padding: "2px 8px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
        >
          OK
        </button>
        <button
          onClick={onCancel}
          style={{ fontSize: 10, padding: "2px 8px", background: "var(--surface-2)", color: "var(--fg-muted)", border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ExperimentRow({
  exp,
  isSelected,
  onSelect,
  onDelete,
  onLock,
  readOnly,
  isAdmin,
}: {
  exp: Experiment;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onLock: () => void;
  readOnly?: boolean;
  isAdmin?: boolean;
}) {
  const isLocked = !!exp.locked_at;

  return (
    <div
      className="group flex items-center justify-between pr-2"
      style={{
        paddingLeft: 32,
        background: isSelected ? "var(--primary-soft)" : "transparent",
        cursor: "pointer",
      }}
      onClick={onSelect}
    >
      <span
        className="py-1.5 text-xs truncate flex-1"
        style={{ color: isSelected ? "var(--primary)" : "var(--fg-muted)", fontWeight: isSelected ? 600 : 400 }}
      >
        {isLocked && <span style={{ marginRight: 4, fontSize: 10 }}>🔒</span>}
        {exp.title}
      </span>
      {!isLocked && isAdmin && (
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm(`Valider et verrouiller "${exp.title}" ? Toutes les entrées seront verrouillées définitivement.`)) onLock(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title="Valider et verrouiller l'expérience"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--success, #22c55e)", fontSize: 12, padding: "0 3px" }}
        >
          ✓
        </button>
      )}
      {!readOnly && !isLocked && (
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm("Supprimer cette expérience ?")) onDelete(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 12, padding: "0 2px" }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function ProjectRow({
  project,
  isExpanded,
  selectedExpId,
  onToggle,
  onSelectExperiment,
  onDeleteProject,
  onAddExperiment,
  readOnly,
  isAdmin,
}: {
  project: Project;
  isExpanded: boolean;
  selectedExpId: string | null;
  onToggle: () => void;
  onSelectExperiment: (expId: string) => void;
  onDeleteProject: () => void;
  onAddExperiment: () => void;
  readOnly?: boolean;
  isAdmin?: boolean;
}) {
  const qc = useQueryClient();
  const expsQuery = useQuery({
    queryKey: ["experiments", project.id],
    queryFn: () => listExperiments(project.id),
    enabled: isExpanded,
    staleTime: 30_000,
  });

  const deleteExpMutation = useMutation({
    mutationFn: deleteExperiment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["experiments", project.id] }),
  });

  const lockExpMutation = useMutation({
    mutationFn: lockExperiment,
    onSuccess: (_data, expId) => {
      qc.invalidateQueries({ queryKey: ["experiments", project.id] });
      qc.invalidateQueries({ queryKey: ["experiment", expId] });
    },
  });

  const [addingExp, setAddingExp] = useState(false);
  const createExpMutation = useMutation({
    mutationFn: (d: { code: string; title: string }) =>
      createExperiment({ project_id: project.id, ...d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiments", project.id] });
      setAddingExp(false);
    },
  });

  return (
    <div>
      {/* Project header */}
      <div
        className="group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
        onClick={onToggle}
      >
        <span
          style={{ width: 8, height: 8, borderRadius: "50%", background: project.color, flexShrink: 0 }}
        />
        <span className="text-xs font-semibold flex-1 truncate" style={{ color: "var(--fg)" }}>
          {project.name}
        </span>
        {!readOnly && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setAddingExp(true); onAddExperiment(); }}
              title="Ajouter une expérience"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)", fontSize: 14, lineHeight: 1 }}
            >
              +
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (confirm("Supprimer ce projet ?")) onDeleteProject(); }}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 14, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}
        <span style={{ color: "var(--fg-subtle)", fontSize: 10 }}>{isExpanded ? "▾" : "▸"}</span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div>
          {!readOnly && addingExp && (
            <NewInlineForm
              placeholder="Nom de l'expérience"
              onSubmit={(code, title) => createExpMutation.mutate({ code, title })}
              onCancel={() => setAddingExp(false)}
            />
          )}
          {expsQuery.data?.map((exp) => (
            <ExperimentRow
              key={exp.id}
              exp={exp}
              isSelected={exp.id === selectedExpId}
              onSelect={() => onSelectExperiment(exp.id)}
              onDelete={() => deleteExpMutation.mutate(exp.id)}
              onLock={() => lockExpMutation.mutate(exp.id)}
              readOnly={readOnly}
              isAdmin={isAdmin}
            />
          ))}
          {expsQuery.data?.length === 0 && !addingExp && (
            <p className="px-8 py-1 text-xs" style={{ color: "var(--fg-subtle)" }}>
              Aucune expérience
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, onAdd, separator }: { label: string; onAdd?: () => void; separator?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-3 pt-3 pb-1"
      style={separator ? { borderTop: "1px solid var(--border)" } : undefined}
    >
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
        {label}
      </span>
      {onAdd && (
        <button
          onClick={onAdd}
          title="Nouveau projet"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)", fontSize: 18, lineHeight: 1 }}
        >
          +
        </button>
      )}
    </div>
  );
}

export default function ProjectTree({ selectedExperimentId, onSelectExperiment }: Props) {
  const qc = useQueryClient();
  const { userId, role } = useAuthStore();
  const isAdmin = role === "admin";
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [addingProject, setAddingProject] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    staleTime: 30_000,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    staleTime: 5 * 60_000,
  });

  const createProjectMutation = useMutation({
    mutationFn: (d: { code: string; name: string }) => createProject(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setAddingProject(false);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  function toggleProject(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Build user display name map
  const userNameMap: Record<string, string> = {};
  usersQuery.data?.forEach((u) => {
    userNameMap[u.id] = u.full_name ?? u.username;
  });

  // Separate my projects from others'
  const allProjects = projectsQuery.data ?? [];
  const myProjects = allProjects.filter((p) => p.owner_id === userId);
  const otherProjects = allProjects.filter((p) => p.owner_id !== userId && p.owner_id != null);

  // Group other projects by owner_id
  const otherGroups: Record<string, Project[]> = {};
  otherProjects.forEach((p) => {
    const oid = p.owner_id!;
    if (!otherGroups[oid]) otherGroups[oid] = [];
    otherGroups[oid].push(p);
  });

  const sortedGroupIds = Object.keys(otherGroups).sort((a, b) =>
    (userNameMap[a] ?? "").localeCompare(userNameMap[b] ?? "")
  );

  function renderProjectRow(project: Project, readOnly?: boolean) {
    return (
      <ProjectRow
        key={project.id}
        project={project}
        isExpanded={expandedProjects.has(project.id)}
        selectedExpId={selectedExperimentId}
        onToggle={() => toggleProject(project.id)}
        onSelectExperiment={(expId) => onSelectExperiment(project.id, expId)}
        onDeleteProject={() => deleteProjectMutation.mutate(project.id)}
        onAddExperiment={() => {
          if (!expandedProjects.has(project.id)) {
            setExpandedProjects((prev) => new Set([...prev, project.id]));
          }
        }}
        readOnly={readOnly}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{ width: 260, minWidth: 260, borderRight: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div
        className="flex items-center px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>
          Cahier de labo
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* My projects */}
        <SectionHeader label="Mes projets" onAdd={() => setAddingProject(true)} />
        {addingProject && (
          <NewInlineForm
            placeholder="Nom du projet"
            onSubmit={(code, name) => createProjectMutation.mutate({ code, name })}
            onCancel={() => setAddingProject(false)}
          />
        )}
        {myProjects.length === 0 && !addingProject && (
          <p className="px-4 py-2 text-xs" style={{ color: "var(--fg-subtle)" }}>
            Aucun projet — clique + pour créer
          </p>
        )}
        {myProjects.map((project) => renderProjectRow(project, false))}

        {/* Other users' projects */}
        {sortedGroupIds.map((ownerId) => (
          <div key={ownerId}>
            <SectionHeader label={userNameMap[ownerId] ?? "Autre utilisateur"} separator />
            {otherGroups[ownerId].map((project) => renderProjectRow(project, true))}
          </div>
        ))}
      </div>
    </aside>
  );
}
