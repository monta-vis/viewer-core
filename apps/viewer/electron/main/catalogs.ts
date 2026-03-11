import path from "path";
import fs from "fs";
import type { SafetyIconCatalog, PartToolIconCatalog } from "@monta-vis/editor-core";
import type { CatalogJson } from "../../src/types/catalog.js";
import { isInsidePath } from "./pathUtils.js";
import { getElectronPaths } from "./electronPaths.js";

/**
 * Scan ~/Documents/Montavis/Catalogs/SafetyIcons/ for subdirectories,
 * read catalog.json from each, and return parsed catalog data.
 */
export function getSafetyIconCatalogs(): SafetyIconCatalog[] {
  const catalogsDir = path.join(
    getElectronPaths().documentsPath,
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

      // Filter out entries missing a valid `id` field
      const validEntries = (parsed.entries ?? []).filter((e) => {
        if (!e.id || typeof e.id !== "string") {
          console.warn(`[catalogs] Skipping entry without id in ${entry.name}: ${e.filename ?? "unknown"}`);
          return false;
        }
        return true;
      });

      catalogs.push({
        name: parsed.name ?? entry.name,
        dirName: entry.name,
        assetsDir: path.join(catalogsDir, entry.name, "assets"),
        categories: parsed.categories ?? [],
        entries: validEntries,
      });
    } catch (err) {
      console.error(`[catalogs] Failed to parse safety icon catalog in ${entry.name}:`, err);
    }
  }

  return catalogs;
}

/**
 * Scan ~/Documents/Montavis/Catalogs/PartToolIcons/ for subdirectories,
 * read catalog.json from each, and return parsed catalog data.
 */
export function getPartToolIconCatalogs(): PartToolIconCatalog[] {
  const catalogsDir = path.join(
    getElectronPaths().documentsPath,
    "Montavis",
    "Catalogs",
    "PartToolIcons",
  );

  if (!fs.existsSync(catalogsDir)) return [];

  const catalogs: PartToolIconCatalog[] = [];
  const entries = fs.readdirSync(catalogsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const catalogJsonPath = path.join(catalogsDir, entry.name, "catalog.json");
    if (!fs.existsSync(catalogJsonPath)) continue;

    try {
      const raw = fs.readFileSync(catalogJsonPath, "utf-8");
      const parsed = JSON.parse(raw) as CatalogJson & {
        entries: Array<CatalogJson["entries"][number] & { tags?: string[]; itemType?: string }>;
      };

      const validEntries = (parsed.entries ?? []).filter((e) => {
        if (!e.id || typeof e.id !== "string") {
          console.warn(`[catalogs] Skipping entry without id in ${entry.name}: ${e.filename ?? "unknown"}`);
          return false;
        }
        return true;
      });

      catalogs.push({
        name: parsed.name ?? entry.name,
        dirName: entry.name,
        assetsDir: path.join(catalogsDir, entry.name, "assets"),
        categories: parsed.categories ?? [],
        entries: validEntries.map((e) => ({
          id: e.id,
          filename: e.filename,
          category: e.category,
          label: e.label,
          tags: e.tags ?? [],
          itemType: (e.itemType === 'Part' || e.itemType === 'Tool' ? e.itemType : 'Part') as 'Part' | 'Tool',
        })),
      });
    } catch (err) {
      console.error(`[catalogs] Failed to parse part tool icon catalog in ${entry.name}:`, err);
    }
  }

  return catalogs;
}

/** Supported catalog types for icon resolution. */
export type CatalogType = 'SafetyIcons' | 'PartToolIcons';

/**
 * Resolve a catalog icon source path.
 * Works for both SafetyIcons and PartToolIcons catalogs.
 * Returns the absolute path to the icon file, or null if not found / outside catalogs dir.
 */
export function resolveCatalogIconPath(catalogType: CatalogType, catalogName: string, filename: string): string | null {
  const catalogsDir = path.join(
    getElectronPaths().documentsPath,
    "Montavis",
    "Catalogs",
    catalogType,
  );

  const iconPath = path.join(catalogsDir, catalogName, "assets", filename);

  // Security: ensure the resolved path is inside the catalogs directory
  if (!isInsidePath(iconPath, catalogsDir)) {
    return null;
  }

  if (!fs.existsSync(iconPath)) return null;
  const stat = fs.lstatSync(iconPath);
  if (!stat.isFile()) return null;

  return iconPath;
}
