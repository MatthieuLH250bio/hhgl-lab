import { useState, useEffect, useRef } from "react";

export type ServerStatus = "online" | "offline" | "checking";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export function useServerStatus(intervalMs = 30_000): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>("checking");
  const controllerRef = useRef<AbortController | null>(null);

  async function check() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await fetch(`${BASE_URL}/health`, { signal: controller.signal });
      if (!controller.signal.aborted) setStatus(res.ok ? "online" : "offline");
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") setStatus("offline");
    }
  }

  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      clearInterval(id);
      controllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return status;
}
