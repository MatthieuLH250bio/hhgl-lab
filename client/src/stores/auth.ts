import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  role: string | null;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
}

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      role: null,
      setTokens: (access, refresh) => {
        const payload = parseJwt(access);
        set({
          accessToken: access,
          refreshToken: refresh,
          userId: (payload?.sub as string) ?? null,
          role: (payload?.role as string) ?? null,
        });
      },
      logout: () => set({ accessToken: null, refreshToken: null, userId: null, role: null }),
    }),
    { name: "hhgl-auth" }
  )
);
