/** The raw catalog.json structure on disk. */
export interface CatalogJson {
  id: string;
  name: string;
  type: string;
  version: number;
  description: string;
  categories: { id: string; label: Record<string, string> }[];
  entries: { filename: string; category: string; label: Record<string, string> }[];
}
