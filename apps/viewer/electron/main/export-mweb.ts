import { app, dialog } from "electron";
import path from "path";
import os from "os";
import crypto from "crypto";
import fs from "fs";
import archiver from "archiver";
import Database from "better-sqlite3";
import { getProjectsBasePath, isInsideBasePath, findImageInDir } from "./projects.js";
import {
  sanitizeFilename,
  readInstructionMeta,
  generateDataJson,
} from "@monta-vis/export-utils";

// ---------------------------------------------------------------------------
// .mweb export — viewer files + data.json + media
// ---------------------------------------------------------------------------

export async function exportMweb(
  folderName: string,
): Promise<{ success: boolean; error?: string }> {
  const projectDir = path.join(getProjectsBasePath(), folderName);

  if (!isInsideBasePath(projectDir) || !fs.existsSync(projectDir)) {
    return { success: false, error: "Project folder not found" };
  }

  const dbPath = path.join(projectDir, "montavis.db");
  if (!fs.existsSync(dbPath)) {
    return { success: false, error: "Database not found in project" };
  }

  const safeName = sanitizeFilename(
    readInstructionMeta(dbPath, Database)?.name ?? folderName,
  );

  // Locate dist-mweb viewer files
  const distMwebDir = app.isPackaged
    ? path.join(process.resourcesPath, "dist-mweb")
    : path.join(process.cwd(), "dist-mweb");

  if (!fs.existsSync(distMwebDir)) {
    return {
      success: false,
      error: `Viewer files not found at ${distMwebDir}. Run "npm run build:mweb" first.`,
    };
  }

  const result = await dialog.showSaveDialog({
    title: "Export .mweb",
    defaultPath: path.join(
      app.getPath("downloads"),
      `${safeName}.mweb.zip`,
    ),
    filters: [{ name: "Montavis Web Bundle", extensions: ["mweb.zip"] }],
  });

  if (result.canceled || !result.filePath)
    return { success: false, error: "Cancelled" };

  try {
    const dataJson = await generateDataJson(
      dbPath,
      Database,
      projectDir,
      findImageInDir,
    );

    // Write JSON to a temp file so archiver can stream it instead of
    // duplicating the entire string in memory as a Buffer (OOM fix).
    const tmpPath = path.join(
      os.tmpdir(),
      `montavis-data-${crypto.randomUUID()}.json`,
    );
    await fs.promises.writeFile(tmpPath, dataJson, "utf-8");

    return new Promise((resolve) => {
      const output = fs.createWriteStream(result.filePath!);
      const archive = archiver("zip", { zlib: { level: 6 } });
      const rootDir = `${safeName}.mweb`;

      output.on("close", () => {
        fs.unlink(tmpPath, () => {});
        console.info(
          `[exportMweb] Exported ${archive.pointer()} bytes to ${result.filePath}`,
        );
        resolve({ success: true });
      });

      archive.on("error", (err) => {
        fs.unlink(tmpPath, () => {});
        console.error("[exportMweb] Archive error:", err);
        resolve({ success: false, error: err.message });
      });

      archive.pipe(output);

      // 1. Add viewer files (index.html, viewer.js, styles.css)
      const viewerFiles = fs.readdirSync(distMwebDir);
      for (const file of viewerFiles) {
        const filePath = path.join(distMwebDir, file);
        if (!fs.statSync(filePath).isFile()) continue;
        const destName = file === "mweb.html" ? "index.html" : file;
        archive.file(filePath, { name: `${rootDir}/${destName}` });
      }

      // 2. Add data.json (streamed from temp file to avoid OOM)
      archive.file(tmpPath, { name: `${rootDir}/data.json` });

      // 3. Add media files
      const mediaDir = path.join(projectDir, "media");
      if (fs.existsSync(mediaDir)) {
        const mediaSubs = fs.readdirSync(mediaDir);
        for (const sub of mediaSubs) {
          if (sub === "sections") continue;
          const subPath = path.join(mediaDir, sub);
          if (fs.statSync(subPath).isDirectory()) {
            archive.directory(subPath, `${rootDir}/media/${sub}`);
          } else {
            archive.file(subPath, { name: `${rootDir}/media/${sub}` });
          }
        }
      }

      // 4. Legacy fallback: bundle filename-based safety icons
      try {
        const iconDb = new Database(dbPath, { readonly: true });
        const usedIcons = iconDb
          .prepare(
            "SELECT DISTINCT safety_icon_id FROM notes WHERE safety_icon_id IS NOT NULL AND safety_icon_id != ''",
          )
          .all() as { safety_icon_id: string }[];
        iconDb.close();

        const legacyIcons = usedIcons.filter((r) =>
          /\.(png|jpg|gif)$/i.test(r.safety_icon_id),
        );
        if (legacyIcons.length > 0) {
          const safetyIconsDir = app.isPackaged
            ? path.join(
                process.resourcesPath,
                "app.asar",
                "dist",
                "SafetyIcons",
              )
            : path.join(process.cwd(), "public", "SafetyIcons");

          for (const row of legacyIcons) {
            const iconFile = row.safety_icon_id.replace(
              /\.(jpg|gif)$/i,
              ".png",
            );
            const iconPath = path.join(safetyIconsDir, iconFile);
            if (
              !path
                .resolve(iconPath)
                .startsWith(path.resolve(safetyIconsDir) + path.sep)
            )
              continue;
            if (fs.existsSync(iconPath)) {
              archive.file(iconPath, {
                name: `${rootDir}/SafetyIcons/${iconFile}`,
              });
            }
          }
        }
      } catch (err) {
        console.warn("[exportMweb] Could not embed legacy safety icons:", err);
      }

      archive.finalize();
    });
  } catch (err) {
    console.error("[exportMweb] Failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
