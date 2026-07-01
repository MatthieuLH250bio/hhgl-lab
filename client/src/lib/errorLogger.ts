export interface LogEntry {
  id: string;
  timestamp: string;
  type: "render" | "unhandled" | "promise";
  message: string;
  stack?: string;
  route: string;
}

const MAX_LOGS = 50;
const STORAGE_KEY = "hhgl_error_logs";

export function getLogs(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveLogs(logs: LogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
}

async function captureAndDownloadScreenshot(errorId: string) {
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(document.body, { useCORS: true, logging: false });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `hhgl-error-${errorId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // screenshot failed silently
  }
}

export async function logError(
  error: unknown,
  type: LogEntry["type"] = "unhandled",
): Promise<void> {
  if (import.meta.env.DEV) {
    console.error("[errorLogger]", error);
    return;
  }
  const err = error instanceof Error ? error : new Error(String(error));
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const entry: LogEntry = {
    id,
    timestamp: new Date().toISOString(),
    type,
    message: err.message,
    stack: err.stack,
    route: window.location.pathname,
  };

  const logs = getLogs();
  logs.push(entry);
  saveLogs(logs);

  captureAndDownloadScreenshot(id);
}

export function clearLogs() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportLogsAsJson() {
  const logs = getLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hhgl-logs-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
