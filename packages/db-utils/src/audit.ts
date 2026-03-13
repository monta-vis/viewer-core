import type Database from "better-sqlite3";
import type { AuditChangeType, TableInfo } from "./types.js";
import { assertValidIdentifier, getTableInfo } from "./sqlHelpers.js";

/** Map from content table name to audit table name (shared by creator + viewer). */
export const AUDIT_TABLE_MAP = {
  instructions: "instructions_audit",
  assemblies: "assemblies_audit",
  steps: "steps_audit",
  substeps: "substeps_audit",
  videos: "videos_audit",
  video_sections: "video_sections_audit",
  video_frame_areas: "video_frame_areas_audit",
  viewport_keyframes: "viewport_keyframes_audit",
  drawings: "drawings_audit",
  notes: "notes_audit",
  part_tools: "part_tools_audit",
  substep_descriptions: "substep_descriptions_audit",
  substep_part_tools: "substep_part_tools_audit",
  substep_images: "substep_images_audit",
  substep_video_sections: "substep_video_sections_audit",
  part_tool_video_frame_areas: "part_tool_video_frame_areas_audit",
  substep_notes: "substep_notes_audit",
  branding: "branding_audit",
  substep_references: "substep_references_audit",
  substep_tutorials: "substep_tutorials_audit",
  variants: "variants_audit",
  variant_exclusions: "variant_exclusions_audit",
} as const;

export type AuditedTable = keyof typeof AUDIT_TABLE_MAP;

/**
 * Build an INSERT statement for an audit table.
 * Skips the `audit_id` column (auto-increment PK).
 * Always adds `change_type` and `changed_at` columns.
 * Only includes data columns that exist in both the audit table and rowData.
 */
export function buildAuditInsert(
  auditTable: string,
  auditColumnNames: string[],
  rowData: Record<string, unknown>,
  changeType: AuditChangeType,
): { sql: string; values: unknown[] } {
  assertValidIdentifier(auditTable);

  const cols: string[] = [];
  const values: unknown[] = [];

  for (const col of auditColumnNames) {
    // Skip auto-increment PK and meta columns (handled separately)
    if (col === "audit_id" || col === "change_type" || col === "changed_at") {
      continue;
    }
    // Only include columns that have data
    if (col in rowData) {
      cols.push(col);
      values.push(rowData[col] ?? null);
    }
  }

  // Always add change_type and changed_at
  cols.push("change_type");
  values.push(changeType);
  cols.push("changed_at");
  values.push(new Date().toISOString());

  const quotedCols = cols.map((c) => `"${c}"`);
  const placeholders = cols.map(() => "?");
  const sql = `INSERT INTO "${auditTable}" (${quotedCols.join(", ")}) VALUES (${placeholders.join(", ")})`;

  return { sql, values };
}

/**
 * Record an audit entry for a table operation.
 * No-op if the table is not mapped in auditTableMap.
 * Uses tableInfoCache to avoid repeated PRAGMA calls.
 */
export function recordAudit(
  db: Database.Database,
  auditTableMap: Record<string, string>,
  table: string,
  rowData: Record<string, unknown>,
  changeType: AuditChangeType,
  tableInfoCache: Record<string, TableInfo> = {},
): void {
  const auditTable = auditTableMap[table];
  if (!auditTable) return;

  // Use cached table info to avoid repeated PRAGMA calls
  const { columns } = getTableInfo(db, auditTable, tableInfoCache);
  const auditColumnNames = Array.from(columns);

  const result = buildAuditInsert(auditTable, auditColumnNames, rowData, changeType);
  db.prepare(result.sql).run(...result.values);
}
