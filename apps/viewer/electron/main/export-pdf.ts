import { app, dialog, BrowserWindow } from "electron";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { getProjectsBasePath, isInsideBasePath } from "./projects.js";
import { sanitizeFilename, readInstructionMeta } from "@monta-vis/export-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// PDF export — render instruction view in hidden window, print to PDF
// ---------------------------------------------------------------------------

export async function exportPdf(
  folderName: string,
): Promise<{ success: boolean; error?: string }> {
  const projectDir = path.join(getProjectsBasePath(), folderName);

  if (!isInsideBasePath(projectDir) || !fs.existsSync(projectDir)) {
    return { success: false, error: "Project folder not found" };
  }

  const dbPath = path.join(projectDir, "montavis.db");
  const meta = readInstructionMeta(dbPath, Database);
  if (!meta) {
    return { success: false, error: "No instruction found in database" };
  }

  const safeName = sanitizeFilename(meta.name);

  const result = await dialog.showSaveDialog({
    title: "Export PDF",
    defaultPath: path.join(app.getPath("downloads"), `${safeName}.pdf`),
    filters: [{ name: "PDF Document", extensions: ["pdf"] }],
  });

  if (result.canceled || !result.filePath)
    return { success: false, error: "Cancelled" };

  let printWin: BrowserWindow | null = null;

  try {
    const mainWin = BrowserWindow.getAllWindows()[0];
    const currentUrl = mainWin?.webContents?.getURL() || "";
    let baseUrl: string;

    if (currentUrl.startsWith("http")) {
      const url = new URL(currentUrl);
      baseUrl = `${url.protocol}//${url.host}`;
    } else {
      baseUrl = currentUrl.replace(/\/[^/]*$/, "");
    }

    printWin = new BrowserWindow({
      width: 1024,
      height: 768,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.mjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    printWin.webContents.on("will-navigate", (event) => {
      event.preventDefault();
    });

    const viewUrl = `${baseUrl}/#/view/${encodeURIComponent(folderName)}?print=true`;
    console.info(`[exportPdf] Loading: ${viewUrl}`);
    await printWin.loadURL(viewUrl);

    const maxWait = 15000;
    const pollInterval = 500;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const ready = await printWin.webContents
        .executeJavaScript(`!!document.querySelector('[data-pdf-ready]')`)
        .catch(() => false);
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pdfData = await printWin.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: "A4",
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
    });

    await fs.promises.writeFile(result.filePath, pdfData);
    console.info(`[exportPdf] Exported PDF to ${result.filePath}`);

    printWin.destroy();
    return { success: true };
  } catch (err) {
    printWin?.destroy();
    console.error("[exportPdf] Failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
