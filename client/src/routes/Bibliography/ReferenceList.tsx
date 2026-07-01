import { useQuery } from "@tanstack/react-query";
import type { Reference } from "../../api/bibliography";
import { listUsers } from "../../api/users";
import { useAuthStore } from "../../stores/auth";

interface Props {
  refs: Reference[];
  selectedId: string | null;
  isLoading: boolean;
  searchQuery: string;
  onSearch: (q: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}

function ReferenceItem({
  ref,
  isSelected,
  onSelect,
  ownerName,
  isOwn,
}: {
  ref: Reference;
  isSelected: boolean;
  onSelect: (id: string) => void;
  ownerName: string | null;
  isOwn: boolean;
}) {
  const firstAuthor = ref.authors[0] ?? null;
  const authorDisplay = firstAuthor
    ? `${firstAuthor}${ref.authors.length > 1 ? " et al." : ""}`
    : null;

  return (
    <button
      onClick={() => onSelect(ref.id)}
      className="w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors"
      style={{
        background: isSelected ? "var(--primary-soft)" : "transparent",
        border: "none",
        borderBottom: "1px solid var(--border)",
        borderLeft: isSelected ? "3px solid var(--primary)" : "3px solid transparent",
        cursor: "pointer",
      }}
    >
      <div className="flex items-start gap-2">
        {ref.year && (
          <span
            className="text-xs font-semibold shrink-0 mt-0.5"
            style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}
          >
            {ref.year}
          </span>
        )}
        <span
          className="text-xs font-semibold leading-snug"
          style={{ color: isSelected ? "var(--primary)" : "var(--fg)" }}
        >
          {ref.title}
        </span>
      </div>
      {(authorDisplay || ref.journal) && (
        <span className="text-xs truncate" style={{ color: "var(--fg-subtle)" }}>
          {[authorDisplay, ref.journal].filter(Boolean).join(" · ")}
        </span>
      )}
      {ownerName && (
        <span className="text-xs" style={{ color: isOwn ? "var(--primary)" : "var(--fg-subtle)", opacity: 0.75 }}>
          {isOwn ? "Moi" : ownerName}
        </span>
      )}
    </button>
  );
}

export default function ReferenceList({
  refs,
  selectedId,
  isLoading,
  searchQuery,
  onSearch,
  onSelect,
  onNew,
}: Props) {
  const userId = useAuthStore((s) => s.userId);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    staleTime: 5 * 60_000,
  });

  const userNameMap: Record<string, string> = {};
  usersQuery.data?.forEach((u) => {
    userNameMap[u.id] = u.full_name ?? u.username;
  });

  return (
    <div
      className="flex flex-col shrink-0"
      style={{ width: 280, borderRight: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
          Bibliographie
        </span>
        <button
          onClick={onNew}
          className="text-xs font-medium rounded px-2 py-1"
          style={{
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          + Nouvelle
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <input
          type="search"
          placeholder="Titre, auteur, journal…"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
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

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <p className="px-4 py-3 text-xs" style={{ color: "var(--fg-muted)" }}>
            Chargement…
          </p>
        )}
        {!isLoading && refs.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
              Aucune référence
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--fg-subtle)" }}>
              Clique sur + Nouvelle pour commencer
            </p>
          </div>
        )}
        {refs.map((r) => (
          <ReferenceItem
            key={r.id}
            ref={r}
            isSelected={selectedId === r.id}
            onSelect={onSelect}
            ownerName={r.added_by_id ? (userNameMap[r.added_by_id] ?? null) : null}
            isOwn={r.added_by_id === userId}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 shrink-0"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}
      >
        <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
          {refs.length} référence{refs.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
