import { mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { documentDir, join } from "@tauri-apps/api/path";
import { toast } from "../stores/toast";
import { useExportConfirmStore } from "../stores/exportConfirm";

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const destLabel = `Documents/export/${today}/`;

  const confirmed = await useExportConfirmStore.getState().requestConfirm(filename, destLabel);
  if (!confirmed) return;

  try {
    const docDir = await documentDir();
    const dir = await join(docDir, "export", today);
    await mkdir(dir, { recursive: true });
    const text = await blob.text();
    const fullPath = await join(dir, filename);
    await writeTextFile(fullPath, text);
    toast.success(`${filename} enregistré`);
  } catch (e) {
    toast.error(`Export échoué : ${String(e)}`);
  }
}

export function svgToImgTag(svg: string, alt = "graphique"): string {
  const b64 = btoa(unescape(encodeURIComponent(svg)));
  return `<figure><img src="data:image/svg+xml;base64,${b64}" style="max-width:100%;border-radius:6px;display:block" alt="${alt}" /></figure>`;
}
