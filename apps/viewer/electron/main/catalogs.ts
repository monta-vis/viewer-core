import { app } from "electron";
import path from "path";
import fs from "fs";
import type { SafetyIconCatalog } from "@monta-vis/editor-core";
import type { CatalogJson } from "../../src/types/catalog.js";
import { isInsidePath } from "./pathUtils.js";

/**
 * Scan ~/Documents/Montavis/Catalogs/SafetyIcons/ for subdirectories,
 * read catalog.json from each, and return parsed catalog data.
 */
export function getSafetyIconCatalogs(): SafetyIconCatalog[] {
  const catalogsDir = path.join(
    app.getPath("documents"),
    "Montavis",
    "Catalogs",
    "SafetyIcons",
  );

  if (!fs.existsSync(catalogsDir)) return [];

  const catalogs: SafetyIconCatalog[] = [];
  const entries = fs.readdirSync(catalogsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const catalogJsonPath = path.join(catalogsDir, entry.name, "catalog.json");
    if (!fs.existsSync(catalogJsonPath)) continue;

    try {
      const raw = fs.readFileSync(catalogJsonPath, "utf-8");
      const parsed = JSON.parse(raw) as CatalogJson;

      catalogs.push({
        name: parsed.name ?? entry.name,
        dirName: entry.name,
        assetsDir: path.join(catalogsDir, entry.name, "assets"),
        categories: parsed.categories ?? [],
        entries: parsed.entries ?? [],
      });
    } catch {
      // Skip malformed catalog files
    }
  }

  return catalogs;
}

/**
 * Resolve a safety icon source path from a catalog.
 * Returns the absolute path to the icon file, or null if not found / outside catalogs dir.
 */
export function resolveSafetyIconPath(catalogName: string, filename: string): string | null {
  const catalogsDir = path.join(
    app.getPath("documents"),
    "Montavis",
    "Catalogs",
    "SafetyIcons",
  );

  const iconPath = path.join(catalogsDir, catalogName, "assets", filename);

  // Security: ensure the resolved path is inside the catalogs directory
  if (!isInsidePath(iconPath, catalogsDir)) {
    return null;
  }

  if (!fs.existsSync(iconPath)) return null;

  return iconPath;
}
