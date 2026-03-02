import { app, dialog } from "electron";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import Database from "better-sqlite3";
import { getProjectsBasePath, isInsideBasePath } from "./projects.js";
import { resolveCatalogIconPath } from "./catalogs.js";
import { parseIconId } from "./catalogIconUtils.js";
import {
  sanitizeFilename,
  readInstructionMeta,
  createCleanedDbCopy,
} from "@monta-vis/export-utils";
import type { MvisManifest } from "@monta-vis/export-utils";

// ---------------------------------------------------------------------------
// .mvis export — zip the entire project folder
// ---------------------------------------------------------------------------

export async function exportMvis(
  folderName: string,
): Promise<{ success: boolean; error?: string }> {
  const projectDir = path.join(getProjectsBasePath(), folderName);

  if (!isInsideBasePath(projectDir) || !fs.existsSync(projectDir)) {
    return { success: false, error: "Project folder not found" };
  }

  const dbPath = path.join(projectDir, "montavis.db");
  const meta = readInstructionMeta(dbPath, Database);
  const baseName = sanitizeFilename(meta?.name ?? folderName);
  const revision = meta?.revision ?? 1;
  const dateStr = meta?.updated_at
    ? new Date(meta.updated_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const fileName = `${baseName}_V${revision}_${dateStr}`;

  const result = await dialog.showSaveDialog({
    title: "Export .mvis",
    defaultPath: path.join(app.getPath("downloads"), `${fileName}.mvis`),
    filters: [{ name: "Montavis Bundle", extensions: ["mvis"] }],
  });

  if (result.canceled || !result.filePath)
    return { success: false, error: "Cancelled" };

  const tempDbPath = path.join(
    app.getPath("temp"),
    `montavis-export-${Date.now()}.db`,
  );
  createCleanedDbCopy(dbPath, tempDbPath, Database);

  return new Promise((resolve) => {
    const cleanup = () => {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        /* ignore */
      }
    };
    const output = fs.createWriteStream(result.filePath!);
    const archive = archiver("zip", { zlib: { level: 6 } });

    output.on("close", () => {
      cleanup();
      console.info(
        `[exportMvis] Exported ${archive.pointer()} bytes to ${result.filePath}`,
      );
      resolve({ success: true });
    });

    archive.on("error", (err) => {
      cleanup();
      console.error("[exportMvis] Archive error:", err);
      resolve({ success: false, error: err.message });
    });

    archive.pipe(output);
    archive.directory(projectDir, `${fileName}.mvis`, (entryData) => {
      if (
        entryData.name.startsWith("proxy/") ||
        entryData.name.startsWith("proxy\\")
      )
        return false;
      if (entryData.name === "montavis.db") return false;
      if (entryData.name === "local_media_paths.json") return false;
      return entryData;
    });
    archive.file(tempDbPath, { name: `${fileName}.mvis/montavis.db` });

    // Embed referenced catalog icons
    try {
      const tempDb = new Database(tempDbPath, { readonly: true });
      const iconRows = tempDb
        .prepare(
          "SELECT DISTINCT icon_id FROM part_tools WHERE icon_id IS NOT NULL AND icon_id != ''",
        )
        .all() as { icon_id: string }[];
      tempDb.close();

      for (const row of iconRows) {
        const parsed = parseIconId(row.icon_id);
        if (parsed) {
          const iconPath = resolveCatalogIconPath(
            "PartToolIcons",
            parsed.catalogName,
            parsed.filename,
          );
          if (iconPath) {
            archive.file(iconPath, {
              name: `${fileName}.mvis/catalog-assets/${parsed.catalogName}/${parsed.filename}`,
            });
          }
        }
      }
    } catch (err) {
      console.warn("[exportMvis] Could not embed catalog assets:", err);
    }

    // Add manifest.json
    if (meta) {
      const manifest: MvisManifest = {
        id: meta.id,
        revision: meta.revision,
        updated_at: meta.updated_at,
      };
      archive.append(JSON.stringify(manifest), {
        name: `${fileName}.mvis/manifest.json`,
      });
    }
    archive.finalize();
  });
}
