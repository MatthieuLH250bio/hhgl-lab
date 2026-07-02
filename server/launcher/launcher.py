"""
HHGL Server Launcher
Lance uvicorn dans un thread interne — aucun Python externe requis.
"""
import sys
if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import logging
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from tkinter import scrolledtext
import tkinter as tk

# ── Ajoute le dossier server/ au path pour importer app.main ─────────────────
def _server_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent / "server"
    return Path(__file__).resolve().parent.parent

_sdir = _server_dir()
if str(_sdir) not in sys.path:
    sys.path.insert(0, str(_sdir))

# ── Crée et charge le .env depuis un dossier accessible en écriture ──────────
def _ensure_env():
    appdata = Path(os.environ.get("APPDATA", Path.home())) / "HHGL"
    appdata.mkdir(parents=True, exist_ok=True)
    env_path = appdata / ".env"
    if not env_path.exists():
        import secrets
        env_path.write_text(
            f"DATABASE_URL=postgresql+asyncpg://hhgl:hhgl@localhost/hhgl\n"
            f"JWT_SECRET={secrets.token_hex(32)}\n"
            f"JWT_ALGORITHM=HS256\n"
            f"ACCESS_TOKEN_EXPIRE_MINUTES=1440\n"
            f"UPLOAD_DIR={appdata / 'uploads'}\n",
            encoding="utf-8",
        )
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

_ensure_env()

# ── Migrations Alembic au premier démarrage ───────────────────────────────────
def _run_migrations():
    try:
        from alembic.config import Config
        from alembic import command
        alembic_cfg = Config(str(_sdir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(_sdir / "alembic"))
        command.upgrade(alembic_cfg, "head")
    except Exception as e:
        print(f"[migrations] {e}")

_run_migrations()

# ── Crée le compte admin par défaut si absent ────────────────────────────────
def _seed_admin():
    try:
        import asyncio
        from seed_admin import seed
        from app.db.session import engine

        async def _run():
            await seed()
            await engine.dispose()

        if sys.platform == "win32":
            loop = asyncio.SelectorEventLoop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(_run())
            loop.close()
        else:
            asyncio.run(_run())
    except Exception as e:
        print(f"[seed_admin] {e}")

_seed_admin()

# ── Imports serveur (disponibles après ajout au path) ────────────────────────
try:
    import uvicorn
    HAS_UVICORN = True
except ImportError:
    HAS_UVICORN = False

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

# ── Couleurs ──────────────────────────────────────────────────────────────────
BG      = "#0f172a"
SURFACE = "#1e293b"
BORDER  = "#334155"
FG      = "#e2e8f0"
FG_MUT  = "#64748b"
PRIMARY = "#6366f1"
SUCCESS = "#22c55e"
DANGER  = "#ef4444"


class QueueHandler(logging.Handler):
    """Redirige les logs uvicorn vers la callback UI."""
    def __init__(self, callback):
        super().__init__()
        self.callback = callback

    def emit(self, record):
        msg = self.format(record)
        level = record.levelno
        tag = "err" if level >= logging.ERROR else \
              "warn" if level >= logging.WARNING else \
              "ok" if "started" in msg.lower() or "running" in msg.lower() else "info"
        self.callback(msg, tag)


class ServerLauncher:

    def __init__(self):
        self._server: uvicorn.Server | None = None
        self._thread: threading.Thread | None = None
        self._start_time: datetime | None = None
        self._alive = True

        self._build_ui()
        if not HAS_UVICORN:
            self._log("ERREUR : uvicorn introuvable dans le bundle.", "err")
        else:
            self._log("HHGL Server Launcher prêt.", "ok")
            self._log(f"Répertoire serveur : {_sdir}", "info")
        self._tick()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self._auto_detect_pg()
        self.root.mainloop()

    # ── UI ────────────────────────────────────────────────────────────────────

    def _build_ui(self):
        self.root = tk.Tk()
        self.root.title("HHGL — Serveur")
        self.root.geometry("660x640")
        self.root.resizable(True, True)
        self.root.minsize(540, 540)
        self.root.configure(bg=BG)

        ico = Path(__file__).parent / "icon.ico"
        if getattr(sys, "frozen", False):
            ico = Path(sys.executable).parent / "icon.ico"
        if ico.exists():
            try:
                self.root.iconbitmap(str(ico))
            except Exception:
                pass

        self._build_header()
        self._build_stats()
        self._build_buttons()
        self._build_pg_config()
        self._build_logs()

    def _build_header(self):
        hdr = tk.Frame(self.root, bg=SURFACE, height=52)
        hdr.pack(fill="x")
        hdr.pack_propagate(False)
        tk.Label(hdr, text="HHGL", bg=SURFACE, fg=FG,
                 font=("Segoe UI", 15, "bold")).pack(side="left", padx=(16, 4), pady=10)
        tk.Label(hdr, text="Serveur", bg=SURFACE, fg="#818cf8",
                 font=("Segoe UI", 11)).pack(side="left", pady=10)
        self.lbl_status = tk.Label(hdr, text="Arrêté", bg=SURFACE, fg=FG_MUT,
                                   font=("Segoe UI", 10))
        self.lbl_status.pack(side="right", padx=(4, 16), pady=10)
        self.dot = tk.Label(hdr, text="●", bg=SURFACE, fg=DANGER,
                            font=("Segoe UI", 16))
        self.dot.pack(side="right", pady=10)

    def _build_stats(self):
        outer = tk.Frame(self.root, bg=BG)
        outer.pack(fill="x", padx=14, pady=(12, 6))
        self.stat_vars: dict[str, tk.StringVar] = {}
        cards = [
            ("url",    "Adresse",  "http://localhost:8000"),
            ("uptime", "Uptime",   "—"),
            ("cpu",    "CPU",      "—"),
            ("ram",    "RAM",      "—"),
        ]
        for i, (key, label, default) in enumerate(cards):
            col, row_idx = i % 2, i // 2
            card = tk.Frame(outer, bg=SURFACE, padx=14, pady=10)
            card.grid(row=row_idx, column=col,
                      padx=(0, 8) if col == 0 else (0, 0),
                      pady=(0, 8), sticky="ew")
            outer.columnconfigure(col, weight=1)
            tk.Label(card, text=label.upper(), bg=SURFACE, fg=FG_MUT,
                     font=("Segoe UI", 8, "bold")).pack(anchor="w")
            var = tk.StringVar(value=default)
            self.stat_vars[key] = var
            tk.Label(card, textvariable=var, bg=SURFACE, fg=FG,
                     font=("Segoe UI", 13, "bold")).pack(anchor="w")

    def _build_buttons(self):
        frm = tk.Frame(self.root, bg=BG)
        frm.pack(fill="x", padx=14, pady=(0, 10))
        kw = dict(font=("Segoe UI", 10, "bold"), relief="flat",
                  cursor="hand2", padx=18, pady=7, bd=0)
        self.btn_start = tk.Button(frm, text="▶  Démarrer",
                                   command=self.start_server,
                                   bg=PRIMARY, fg="white",
                                   activebackground="#4f46e5",
                                   activeforeground="white", **kw)
        self.btn_start.pack(side="left", padx=(0, 8))
        self.btn_stop = tk.Button(frm, text="■  Arrêter",
                                  command=self.stop_server,
                                  bg=SURFACE, fg=DANGER,
                                  activebackground=BORDER,
                                  activeforeground=DANGER,
                                  state="disabled", **kw)
        self.btn_stop.pack(side="left", padx=(0, 8))
        self.btn_restart = tk.Button(frm, text="↺  Redémarrer",
                                     command=self.restart_server,
                                     bg=SURFACE, fg=FG_MUT,
                                     activebackground=BORDER,
                                     activeforeground=FG,
                                     state="disabled", **kw)
        self.btn_restart.pack(side="left")
        tk.Button(frm, text="🔌 Extension Chrome",
                  command=self._chrome_guide,
                  bg=SURFACE, fg="#22d3ee",
                  activebackground=BORDER, activeforeground="#22d3ee",
                  font=("Segoe UI", 10), relief="flat",
                  cursor="hand2", padx=14, pady=7, bd=0
                  ).pack(side="right")

    def _build_logs(self):
        top = tk.Frame(self.root, bg=BG)
        top.pack(fill="x", padx=14, pady=(2, 4))
        tk.Label(top, text="LOGS", bg=BG, fg=FG_MUT,
                 font=("Segoe UI", 8, "bold")).pack(side="left")
        tk.Button(top, text="Vider", command=self._clear_log,
                  bg=BG, fg=FG_MUT, relief="flat", cursor="hand2",
                  font=("Segoe UI", 8)).pack(side="right")
        self.log_box = scrolledtext.ScrolledText(
            self.root, bg=SURFACE, fg=FG_MUT,
            font=("Consolas", 9), relief="flat", bd=0,
            insertbackground=FG, state="disabled", wrap="word")
        self.log_box.pack(fill="both", expand=True, padx=14, pady=(0, 14))
        self.log_box.tag_config("ok",   foreground="#4ade80")
        self.log_box.tag_config("err",  foreground="#f87171")
        self.log_box.tag_config("warn", foreground="#fbbf24")
        self.log_box.tag_config("info", foreground="#64748b")

    # ── PostgreSQL config ─────────────────────────────────────────────────────

    def _build_pg_config(self):
        frm = tk.Frame(self.root, bg=SURFACE, pady=8)
        frm.pack(fill="x", padx=14, pady=(0, 8))
        tk.Label(frm, text="POSTGRESQL", bg=SURFACE, fg=FG_MUT,
                 font=("Segoe UI", 8, "bold")).pack(side="left", padx=(10, 12))
        tk.Label(frm, text="Port :", bg=SURFACE, fg=FG,
                 font=("Segoe UI", 10)).pack(side="left")
        self.pg_port_var = tk.StringVar(value="5432")
        tk.Entry(frm, textvariable=self.pg_port_var, width=6,
                 bg=BG, fg=FG, insertbackground=FG, relief="flat",
                 font=("Segoe UI", 10)).pack(side="left", padx=(4, 10))
        tk.Button(frm, text="Détecter", command=self._on_detect_pg,
                  bg=BG, fg=FG_MUT, relief="flat", cursor="hand2",
                  font=("Segoe UI", 9), padx=8, pady=3).pack(side="left", padx=(0, 6))
        tk.Button(frm, text="Configurer la base", command=self._on_setup_db,
                  bg=BG, fg="#22d3ee", relief="flat", cursor="hand2",
                  font=("Segoe UI", 9), padx=8, pady=3).pack(side="left")
        self.pg_dot = tk.Label(frm, text="●", bg=SURFACE, fg=FG_MUT,
                               font=("Segoe UI", 14))
        self.pg_dot.pack(side="right", padx=(0, 10))
        self.pg_lbl = tk.Label(frm, text="—", bg=SURFACE, fg=FG_MUT,
                               font=("Segoe UI", 9))
        self.pg_lbl.pack(side="right")

    def _detect_pg_port(self):
        import socket
        for port in [5432, 5433, 5434, 5435]:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(0.3)
                if s.connect_ex(("127.0.0.1", port)) == 0:
                    s.close()
                    return port
                s.close()
            except Exception:
                pass
        return None

    def _update_env_port(self, port: int):
        import re
        appdata = Path(os.environ.get("APPDATA", Path.home())) / "HHGL"
        env_path = appdata / ".env"
        if env_path.exists():
            content = env_path.read_text(encoding="utf-8")
            content = re.sub(
                r"(postgresql\+asyncpg://[^@]+@[^:/]+:)\d+(/\S*)",
                rf"\g<1>{port}\2",
                content,
            )
            env_path.write_text(content, encoding="utf-8")
        current = os.environ.get("DATABASE_URL", "")
        os.environ["DATABASE_URL"] = re.sub(
            r"(postgresql\+asyncpg://[^@]+@[^:/]+:)\d+(/\S*)",
            rf"\g<1>{port}\2",
            current,
        )

    def _auto_detect_pg(self):
        port = self._detect_pg_port()
        if port:
            self.pg_port_var.set(str(port))
            self._update_env_port(port)
            self.pg_dot.config(fg=SUCCESS)
            self.pg_lbl.config(text=f"Port {port} détecté", fg=SUCCESS)
            self._log(f"PostgreSQL détecté sur le port {port}.", "ok")
        else:
            self.pg_dot.config(fg=DANGER)
            self.pg_lbl.config(text="Non trouvé", fg=DANGER)
            self._log("PostgreSQL non détecté — installez-le ou démarrez le service.", "err")

    def _on_detect_pg(self):
        self.pg_dot.config(fg="#fbbf24")
        self.pg_lbl.config(text="Détection…", fg="#fbbf24")
        self.root.update()
        self._auto_detect_pg()

    def _on_setup_db(self):
        import subprocess, re
        port = self.pg_port_var.get() or "5432"
        self._log(f"Configuration de la base sur le port {port}…", "warn")
        psql = next(
            (p for p in [
                r"C:\Program Files\PostgreSQL\16\bin\psql.exe",
                r"C:\Program Files\PostgreSQL\17\bin\psql.exe",
                r"C:\Program Files\PostgreSQL\18\bin\psql.exe",
                r"C:\Program Files\PostgreSQL\15\bin\psql.exe",
            ] if Path(p).exists()),
            None,
        )
        if not psql:
            self._log("psql.exe introuvable — vérifiez l'installation PostgreSQL.", "err")
            return
        base = [psql, "-U", "postgres", "-h", "127.0.0.1", "-p", port]
        env = {**os.environ, "PGPASSWORD": ""}
        for sql, msg in [
            ("CREATE USER hhgl WITH PASSWORD 'hhgl' CREATEDB;", "Utilisateur hhgl créé"),
            ("CREATE DATABASE hhgl OWNER hhgl;", "Base hhgl créée"),
            ("GRANT ALL PRIVILEGES ON DATABASE hhgl TO hhgl;", "Permissions accordées"),
        ]:
            try:
                r = subprocess.run(base + ["-c", sql], capture_output=True,
                                   text=True, timeout=10, env=env)
                if r.returncode == 0:
                    self._log(msg, "ok")
                elif "already exists" in r.stderr.lower() or "existe déjà" in r.stderr.lower():
                    self._log(f"(déjà existant) {msg}", "info")
                else:
                    self._log(f"Avertissement : {r.stderr.strip()}", "warn")
            except Exception as e:
                self._log(f"Erreur : {e}", "err")
        self._log("Configuration terminée — relancez le serveur.", "ok")

    # ── Logs ──────────────────────────────────────────────────────────────────

    def _log(self, msg: str, tag: str = "info"):
        ts = datetime.now().strftime("%H:%M:%S")
        self.log_box.configure(state="normal")
        self.log_box.insert("end", f"[{ts}]  {msg}\n", tag)
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def _log_safe(self, msg: str, tag: str = "info"):
        self.root.after(0, self._log, msg, tag)

    def _clear_log(self):
        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.configure(state="disabled")

    # ── Serveur ───────────────────────────────────────────────────────────────

    def start_server(self):
        if self._thread and self._thread.is_alive():
            return
        if not HAS_UVICORN:
            self._log("uvicorn non disponible.", "err")
            return

        self._log("Démarrage du serveur…", "warn")

        # Installe le handler de log uvicorn
        handler = QueueHandler(self._log_safe)
        handler.setFormatter(logging.Formatter("%(levelname)s  %(name)s — %(message)s"))
        for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
            lg = logging.getLogger(name)
            lg.handlers.clear()
            lg.addHandler(handler)
            lg.setLevel(logging.INFO)

        os.chdir(str(_sdir))

        cfg = uvicorn.Config(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            log_config=None,
            loop="asyncio",
        )
        self._server = uvicorn.Server(cfg)

        def _run():
            try:
                if sys.platform == "win32":
                    import asyncio
                    loop = asyncio.SelectorEventLoop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(self._server.serve())
                    loop.close()
                else:
                    self._server.run()
            except Exception as e:
                self._log_safe(f"Erreur serveur : {e}", "err")
            finally:
                self.root.after(0, self._set_running, False)

        self._thread = threading.Thread(target=_run, daemon=True)
        self._thread.start()
        self._start_time = datetime.now()
        self._set_running(True)

    def stop_server(self):
        if self._server:
            self._log("Arrêt du serveur…", "warn")
            self._server.should_exit = True
            self._server = None
        self._start_time = None
        self._set_running(False)
        self._log("Serveur arrêté.", "err")

    def restart_server(self):
        self.stop_server()
        time.sleep(1)
        self.start_server()

    def _set_running(self, running: bool):
        if running:
            self.dot.config(fg=SUCCESS)
            self.lbl_status.config(text="En ligne", fg=SUCCESS)
            self.btn_start.config(state="disabled")
            self.btn_stop.config(state="normal")
            self.btn_restart.config(state="normal")
        else:
            self.dot.config(fg=DANGER)
            self.lbl_status.config(text="Arrêté", fg=FG_MUT)
            self.btn_start.config(state="normal")
            self.btn_stop.config(state="disabled")
            self.btn_restart.config(state="disabled")
            for k in ("uptime", "cpu", "ram"):
                self.stat_vars[k].set("—")

    # ── Stats ─────────────────────────────────────────────────────────────────

    def _tick(self):
        if not self._alive:
            return
        if self._thread and self._thread.is_alive() and self._start_time:
            elapsed = int((datetime.now() - self._start_time).total_seconds())
            h, r = divmod(elapsed, 3600)
            m, s = divmod(r, 60)
            self.stat_vars["uptime"].set(f"{h:02d}h {m:02d}m {s:02d}s")
            if HAS_PSUTIL:
                try:
                    proc = psutil.Process(os.getpid())
                    cpu = proc.cpu_percent(interval=None)
                    ram = proc.memory_info().rss / 1024 / 1024
                    self.stat_vars["cpu"].set(f"{cpu:.1f} %")
                    self.stat_vars["ram"].set(f"{ram:.0f} MB")
                except Exception:
                    pass
        self.root.after(2000, self._tick)

    # ── Chrome ────────────────────────────────────────────────────────────────

    def _chrome_guide(self):
        import subprocess as sp
        ext_dir = Path(sys.executable).parent / "chrome-extension" \
            if getattr(sys, "frozen", False) \
            else Path(__file__).parent.parent.parent / "hhgl-extension"

        win = tk.Toplevel(self.root)
        win.title("Extension Chrome")
        win.configure(bg=SURFACE)
        win.geometry("480x260")
        win.resizable(False, False)
        msg = (
            "Pour installer l'extension Chrome :\n\n"
            "1. Ouvrez Chrome → chrome://extensions\n"
            "2. Activez le mode développeur (en haut à droite)\n"
            "3. Cliquez sur « Charger l'extension non empaquetée »\n"
            f"4. Sélectionnez le dossier :\n   {ext_dir}"
        )
        tk.Label(win, text=msg, bg=SURFACE, fg=FG, font=("Segoe UI", 10),
                 justify="left", wraplength=440).pack(padx=20, pady=20)
        frm = tk.Frame(win, bg=SURFACE)
        frm.pack(pady=4)
        tk.Button(frm, text="Ouvrir le dossier", bg=PRIMARY, fg="white",
                  relief="flat", cursor="hand2", font=("Segoe UI", 10),
                  padx=12, pady=6,
                  command=lambda: sp.Popen(["explorer", str(ext_dir)]) if ext_dir.exists() else None
                  ).pack(side="left", padx=6)
        tk.Button(frm, text="Ouvrir Chrome Extensions", bg=SURFACE, fg="#22d3ee",
                  relief="flat", cursor="hand2", font=("Segoe UI", 10), padx=12, pady=6,
                  command=lambda: sp.Popen(["cmd", "/c", "start", "chrome", "chrome://extensions"])
                  ).pack(side="left", padx=6)

    # ── Fermeture ─────────────────────────────────────────────────────────────

    def _on_close(self):
        self._alive = False
        if self._server:
            self._server.should_exit = True
        self.root.destroy()


if __name__ == "__main__":
    ServerLauncher()
