/** A single safety icon entry from a catalog.json file. */
export interface CatalogEntry {
  filename: string;
  category: string;
  label: Record<string, string>;
}

/** A category definition from catalog.json. */
export interface CatalogCategory {
  id: string;
  label: Record<string, string>;
}

/** The raw catalog.json structure on disk. */
export interface CatalogJson {
  id: string;
  name: string;
  type: string;
  version: number;
  description: string;
  categories: CatalogCategory[];
  entries: CatalogEntry[];
}

/** A catalog loaded from disk with its asset directory path. */
export interface SafetyIconCatalog {
  name: string;
  assetsDir: string;
  categories: CatalogCategory[];
  entries: CatalogEntry[];
}
