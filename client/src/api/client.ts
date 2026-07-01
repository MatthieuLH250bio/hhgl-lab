import { useAuthStore } from "../stores/auth";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { accessToken, refreshToken, setTokens, logout } = useAuthStore.getState();

  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Token expiré → on tente un refresh automatique
  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setTokens(data.access_token, data.refresh_token);
      headers.set("Authorization", `Bearer ${data.access_token}`);
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    } else {
      logout();
      throw new Error("Session expirée, reconnecte-toi.");
    }
  }

  return res;
}
