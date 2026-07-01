import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUiStore } from "../../stores/ui";
import { useAuthStore } from "../../stores/auth";
import { createUser, getMe, listUsers, updateMe, updateUser, type UserItem } from "../../api/users";
import { getLogs, clearLogs, exportLogsAsJson, type LogEntry } from "../../lib/errorLogger";
import { toast } from "../../stores/toast";

const SHORTCUTS = [
  { key: "Ctrl K",       desc: "Recherche globale" },
  { key: "Ctrl B",       desc: "Gras (éditeur)" },
  { key: "Ctrl I",       desc: "Italique (éditeur)" },
  { key: "Ctrl `",       desc: "Code inline (éditeur)" },
  { key: "Ctrl Z",       desc: "Annuler (éditeur)" },
  { key: "Ctrl Shift Z", desc: "Rétablir (éditeur)" },
  { key: "↑ ↓",         desc: "Naviguer dans la recherche" },
  { key: "Entrée",       desc: "Ouvrir le résultat sélectionné" },
  { key: "Échap",        desc: "Fermer la recherche / annuler" },
];

const inputStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 13,
  color: "var(--fg)",
  outline: "none",
  width: "100%",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--fg-subtle)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className="rounded px-2 py-0.5 text-xs font-semibold"
      style={{
        background: role === "admin" ? "color-mix(in oklab,var(--warning) 15%,transparent)" : "var(--surface-2)",
        color: role === "admin" ? "var(--warning)" : "var(--fg-muted)",
        border: `1px solid ${role === "admin" ? "color-mix(in oklab,var(--warning) 30%,transparent)" : "var(--border)"}`,
      }}
    >
      {role === "admin" ? "Admin" : "Membre"}
    </span>
  );
}

function UserRow({ user, currentUserId }: { user: UserItem; currentUserId: string | null }) {
  const qc = useQueryClient();
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const updateMut = useMutation({
    mutationFn: (data: Parameters<typeof updateUser>[1]) => updateUser(user.id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditingPassword(false);
      setNewPassword("");
      if ("password" in vars) toast.success("Mot de passe modifié");
      else if ("role" in vars) toast.success("Rôle mis à jour");
      else if ("is_active" in vars) toast.info(vars.is_active ? "Compte réactivé" : "Compte désactivé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isSelf = user.id === currentUserId;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)", opacity: user.is_active ? 1 : 0.5 }}
    >
      {/* Avatar placeholder */}
      <div
        className="rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
        style={{ width: 32, height: 32, background: "var(--primary-soft)", color: "var(--primary)" }}
      >
        {(user.full_name ?? user.username).charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium truncate" style={{ color: "var(--fg)" }}>
          {user.full_name ?? user.username}
          {isSelf && <span className="ml-1.5 text-xs" style={{ color: "var(--fg-subtle)" }}>(vous)</span>}
        </span>
        <span className="text-xs truncate" style={{ color: "var(--fg-subtle)" }}>{user.email}</span>
      </div>

      <RoleBadge role={user.role} />

      {/* Actions — not for self */}
      {!isSelf && (
        <div className="flex items-center gap-1.5 shrink-0">
          {editingPassword ? (
            <>
              <input
                autoFocus
                type="password"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setEditingPassword(false); setNewPassword(""); }
                  if (e.key === "Enter" && newPassword.length >= 6) updateMut.mutate({ password: newPassword });
                }}
                style={{ ...inputStyle, width: 180, fontSize: 12 }}
              />
              <button
                onClick={() => { if (newPassword.length >= 6) updateMut.mutate({ password: newPassword }); }}
                disabled={newPassword.length < 6 || updateMut.isPending}
                className="rounded px-2 py-1 text-xs font-medium"
                style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", opacity: newPassword.length < 6 ? 0.5 : 1 }}
              >
                OK
              </button>
              <button
                onClick={() => { setEditingPassword(false); setNewPassword(""); }}
                className="rounded px-2 py-1 text-xs"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => updateMut.mutate({ role: user.role === "admin" ? "member" : "admin" })}
                className="rounded px-2 py-1 text-xs"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
                title={user.role === "admin" ? "Rétrograder en membre" : "Promouvoir en admin"}
              >
                {user.role === "admin" ? "→ Membre" : "→ Admin"}
              </button>
              <button
                onClick={() => setEditingPassword(true)}
                className="rounded px-2 py-1 text-xs"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
              >
                MDP
              </button>
              <button
                onClick={() => updateMut.mutate({ is_active: !user.is_active })}
                className="rounded px-2 py-1 text-xs"
                style={{
                  background: "transparent",
                  border: `1px solid ${user.is_active ? "var(--danger)" : "var(--border)"}`,
                  color: user.is_active ? "var(--danger)" : "var(--fg-muted)",
                  cursor: "pointer",
                }}
              >
                {user.is_active ? "Désactiver" : "Réactiver"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NewUserForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", username: "", full_name: "", password: "", role: "member" });
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () => createUser({
      email: form.email.trim(),
      username: form.username.trim(),
      full_name: form.full_name.trim() || undefined,
      password: form.password,
      role: form.role,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Compte créé");
      onDone();
    },
    onError: (e: Error) => { setError(e.message); toast.error(e.message); },
  });

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setError(null);
    };
  }

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-sm font-semibold" style={{ color: "var(--fg)" }}>Nouveau membre</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Email *</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="alice@labo.fr" style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Identifiant *</label>
          <input type="text" value={form.username} onChange={set("username")} placeholder="alice" style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Nom complet</label>
          <input type="text" value={form.full_name} onChange={set("full_name")} placeholder="Alice Martin" style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Mot de passe *</label>
          <input type="password" value={form.password} onChange={set("password")} placeholder="≥ 6 caractères" style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Rôle</label>
          <select value={form.role} onChange={set("role")} style={{ ...inputStyle }}>
            <option value="member">Membre</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="text-xs rounded px-3 py-2" style={{ background: "color-mix(in oklab,var(--danger) 10%,transparent)", color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onDone}
          className="rounded px-4 py-1.5 text-sm"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer" }}
        >
          Annuler
        </button>
        <button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending || !form.email || !form.username || form.password.length < 6}
          className="rounded px-4 py-1.5 text-sm font-medium"
          style={{
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            opacity: (!form.email || !form.username || form.password.length < 6) ? 0.5 : 1,
          }}
        >
          {createMut.isPending ? "Création…" : "Créer le compte"}
        </button>
      </div>
    </div>
  );
}

function ProfileSection() {
  const qc = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    staleTime: 60_000,
  });

  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);

  const nameMut = useMutation({
    mutationFn: (name: string) => updateMe({ full_name: name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditingName(false);
      toast.success("Nom mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pwdMut = useMutation({
    mutationFn: (pwd: string) => updateMe({ password: pwd }),
    onSuccess: () => {
      setChangingPwd(false);
      setNewPwd("");
      setConfirmPwd("");
      setPwdError(null);
      toast.success("Mot de passe modifié");
    },
    onError: (e: Error) => { setPwdError(e.message); toast.error(e.message); },
  });

  function submitPwd() {
    if (newPwd.length < 6) { setPwdError("Au moins 6 caractères"); return; }
    if (newPwd !== confirmPwd) { setPwdError("Les mots de passe ne correspondent pas"); return; }
    pwdMut.mutate(newPwd);
  }

  const me = meQuery.data;

  return (
    <Section title="Mon profil">
      <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>

        {/* Identity */}
        <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div
            className="rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
            style={{ width: 44, height: 44, background: "var(--primary-soft)", color: "var(--primary)" }}
          >
            {me ? (me.full_name ?? me.username).charAt(0).toUpperCase() : "?"}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
              {me?.full_name ?? me?.username ?? "—"}
            </span>
            <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
              @{me?.username} · {me?.email}
            </span>
          </div>
          {me && <RoleBadge role={me.role} />}
        </div>

        {/* Full name */}
        <div className="flex items-center justify-between gap-4 px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Nom affiché</span>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  autoFocus
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && fullName.trim()) nameMut.mutate(fullName.trim());
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  placeholder="Prénom Nom"
                  style={{ ...inputStyle, width: 220 }}
                />
                <button
                  onClick={() => { if (fullName.trim()) nameMut.mutate(fullName.trim()); }}
                  disabled={!fullName.trim() || nameMut.isPending}
                  className="rounded px-2 py-1 text-xs font-medium"
                  style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  {nameMut.isPending ? "…" : "OK"}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="rounded px-2 py-1 text-xs"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="text-sm" style={{ color: "var(--fg)" }}>{me?.full_name ?? <em style={{ color: "var(--fg-subtle)" }}>non défini</em>}</span>
            )}
          </div>
          {!editingName && (
            <button
              onClick={() => { setFullName(me?.full_name ?? ""); setEditingName(true); }}
              className="rounded px-3 py-1.5 text-xs shrink-0"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
            >
              Modifier
            </button>
          )}
        </div>

        {/* Password */}
        <div className="px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-subtle)" }}>Mot de passe</span>
            {!changingPwd && (
              <button
                onClick={() => { setChangingPwd(true); setPwdError(null); }}
                className="rounded px-3 py-1.5 text-xs shrink-0"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
              >
                Changer
              </button>
            )}
          </div>
          {changingPwd && (
            <div className="flex flex-col gap-2 mt-2">
              <input
                autoFocus
                type="password"
                placeholder="Nouveau mot de passe (≥ 6 caractères)"
                value={newPwd}
                onChange={(e) => { setNewPwd(e.target.value); setPwdError(null); }}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPwd}
                onChange={(e) => { setConfirmPwd(e.target.value); setPwdError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") submitPwd(); if (e.key === "Escape") setChangingPwd(false); }}
                style={inputStyle}
              />
              {pwdError && (
                <p className="text-xs rounded px-3 py-1.5" style={{ background: "color-mix(in oklab,var(--danger) 10%,transparent)", color: "var(--danger)" }}>
                  {pwdError}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setChangingPwd(false); setNewPwd(""); setConfirmPwd(""); setPwdError(null); }}
                  className="rounded px-3 py-1.5 text-xs"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
                >
                  Annuler
                </button>
                <button
                  onClick={submitPwd}
                  disabled={pwdMut.isPending}
                  className="rounded px-3 py-1.5 text-xs font-medium"
                  style={{ background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  {pwdMut.isPending ? "…" : "Enregistrer"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </Section>
  );
}

function MembersSection({ currentUserId }: { currentUserId: string | null }) {
  const [adding, setAdding] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    staleTime: 30_000,
  });

  const allUsers = usersQuery.data ?? [];

  return (
    <Section title="Membres">
      <div className="flex flex-col gap-4">
        {/* User list */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {allUsers.length === 0 && (
            <p className="px-4 py-3 text-xs" style={{ color: "var(--fg-subtle)" }}>Aucun utilisateur</p>
          )}
          {allUsers.map((u) => (
            <UserRow key={u.id} user={u} currentUserId={currentUserId} />
          ))}
        </div>

        {adding ? (
          <NewUserForm onDone={() => setAdding(false)} />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-xl px-4 py-3 text-sm font-medium text-left"
            style={{
              background: "transparent",
              border: "1px dashed var(--border)",
              color: "var(--fg-muted)",
              cursor: "pointer",
            }}
          >
            + Ajouter un membre
          </button>
        )}
      </div>
    </Section>
  );
}

const TYPE_LABELS: Record<LogEntry["type"], string> = {
  render: "Rendu React",
  unhandled: "Erreur JS",
  promise: "Promise rejetée",
};

const TYPE_COLORS: Record<LogEntry["type"], string> = {
  render: "var(--danger)",
  unhandled: "var(--warning)",
  promise: "var(--accent)",
};

function LogsSection() {
  const [logs, setLogs] = useState<LogEntry[]>(() => getLogs());
  const [expanded, setExpanded] = useState<string | null>(null);

  function handleClear() {
    if (!confirm("Effacer tous les logs ?")) return;
    clearLogs();
    setLogs([]);
  }

  function handleExport() {
    exportLogsAsJson();
  }

  const sorted = [...logs].reverse();

  return (
    <Section title="Logs d'erreurs">
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: logs.length > 0 ? "1px solid var(--border)" : "none" }}
        >
          <span className="text-sm" style={{ color: "var(--fg-muted)" }}>
            {logs.length === 0
              ? "Aucun log enregistré"
              : `${logs.length} entrée${logs.length > 1 ? "s" : ""}`}
          </span>
          <div className="flex gap-2">
            {logs.length > 0 && (
              <>
                <button
                  onClick={handleExport}
                  className="rounded px-3 py-1.5 text-xs"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }}
                >
                  Exporter JSON
                </button>
                <button
                  onClick={handleClear}
                  className="rounded px-3 py-1.5 text-xs"
                  style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", cursor: "pointer" }}
                >
                  Effacer
                </button>
              </>
            )}
          </div>
        </div>

        {/* Log list */}
        {sorted.map((log, i) => (
          <div key={log.id}>
            <button
              onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left"
              style={{
                background: "none",
                border: "none",
                borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
              }}
            >
              <span
                className="rounded px-1.5 py-0.5 text-xs font-semibold shrink-0 mt-0.5"
                style={{
                  background: `color-mix(in oklab, ${TYPE_COLORS[log.type]} 15%, transparent)`,
                  color: TYPE_COLORS[log.type],
                }}
              >
                {TYPE_LABELS[log.type]}
              </span>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-xs font-medium truncate" style={{ color: "var(--fg)" }}>
                  {log.message}
                </span>
                <span className="text-xs" style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-mono)" }}>
                  {new Date(log.timestamp).toLocaleString("fr-FR")} · {log.route}
                </span>
              </div>
              <span style={{ color: "var(--fg-subtle)", fontSize: 11, marginTop: 2 }}>
                {expanded === log.id ? "▾" : "▸"}
              </span>
            </button>

            {expanded === log.id && log.stack && (
              <div
                className="px-4 py-3"
                style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none", background: "var(--surface-2)" }}
              >
                <pre
                  style={{
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    margin: 0,
                    fontFamily: "var(--font-mono)",
                    maxHeight: 200,
                    overflow: "auto",
                  }}
                >
                  {log.stack}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useUiStore();
  const { logout, userId, role } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="px-8 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <h1 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>Paramètres</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-8" style={{ maxWidth: 560 }}>

          {/* ── Apparence ────────────────────────────────────────────── */}
          <Section title="Apparence">
            <div
              className="rounded-xl p-5 flex items-center justify-between"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>Thème</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
                  {theme === "light" ? "Mode clair actif" : "Mode sombre actif"}
                </p>
              </div>
              <div className="flex gap-2">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { if (theme !== t) toggleTheme(); }}
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{
                      background: theme === t ? "var(--primary)" : "var(--surface-2)",
                      color: theme === t ? "#fff" : "var(--fg-muted)",
                      border: `1px solid ${theme === t ? "var(--primary)" : "var(--border)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {t === "light" ? "☀ Clair" : "◑ Sombre"}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Mon profil ───────────────────────────────────────────── */}
          <ProfileSection />

          {/* ── Membres (admin only) ──────────────────────────────────── */}
          {isAdmin && <MembersSection currentUserId={userId} />}

          {/* ── Raccourcis ────────────────────────────────────────────── */}
          <Section title="Raccourcis clavier">
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {SHORTCUTS.map(({ key, desc }, i) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{
                    background: i % 2 === 0 ? "var(--surface)" : "transparent",
                    borderBottom: i < SHORTCUTS.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span className="text-sm" style={{ color: "var(--fg-muted)" }}>{desc}</span>
                  <kbd
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--fg)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Compte ───────────────────────────────────────────────── */}
          <Section title="Compte">
            <div
              className="rounded-xl p-5 flex items-center justify-between"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                Déconnectez-vous de HHGL Lab.
              </p>
              <button
                onClick={handleLogout}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{
                  background: "transparent",
                  border: "1px solid var(--danger)",
                  color: "var(--danger)",
                  cursor: "pointer",
                }}
              >
                Se déconnecter
              </button>
            </div>
          </Section>

          {/* ── Logs d'erreurs ───────────────────────────────────────── */}
          <LogsSection />

          {/* ── À propos ─────────────────────────────────────────────── */}
          <Section title="À propos">
            <div
              className="rounded-xl px-5 py-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--fg)" }}>HHGL Lab</p>
              <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
                Application de gestion de laboratoire scientifique.
              </p>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
