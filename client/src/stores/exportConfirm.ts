import { create } from "zustand";

interface Pending {
  filename: string;
  destLabel: string; // e.g. "Documents/export/2026-05-12/"
}

interface ExportConfirmState {
  pending: Pending | null;
  _resolver: ((ok: boolean) => void) | null;
  requestConfirm: (filename: string, destLabel: string) => Promise<boolean>;
  resolve: (ok: boolean) => void;
}

export const useExportConfirmStore = create<ExportConfirmState>((set, get) => ({
  pending: null,
  _resolver: null,
  requestConfirm: (filename, destLabel) =>
    new Promise<boolean>((resolve) => {
      set({ pending: { filename, destLabel }, _resolver: resolve });
    }),
  resolve: (ok) => {
    get()._resolver?.(ok);
    set({ pending: null, _resolver: null });
  },
}));
