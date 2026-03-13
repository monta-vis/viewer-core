export { saveProjectData } from "./saveProjectData.js";
export { recordAudit, buildAuditInsert, AUDIT_TABLE_MAP, type AuditedTable } from "./audit.js";
export { assertValidIdentifier, getTableInfo, toSqliteValue } from "./sqlHelpers.js";
export type {
  ProjectChanges,
  SaveConfig,
  SaveResult,
  AuditChangeType,
  Logger,
  TableInfo,
} from "./types.js";

// Migration infrastructure
export type { Migration, MigrationConfig } from "./migrationTypes.js";
export { dbColumns, hasColumn, dbTableExists } from "./migrationHelpers.js";
export { runMigrations, ensureMigrated } from "./migrationRunner.js";
export {
  migrateV44_renameTutorials,
  migrateV45_previewColumns,
  migrateV46_variants,
  migrateV47_variantPreviewImage,
  SHARED_MIGRATIONS,
  SHARED_SCHEMA_VERSION,
} from "./sharedMigrations.js";
