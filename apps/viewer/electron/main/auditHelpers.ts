import type Database from "better-sqlite3";
import { recordAudit, AUDIT_TABLE_MAP, type TableInfo, type AuditChangeType } from "@monta-vis/db-utils";

/** Create a bound audit helper with a shared table info cache for a transaction. */
export function createAuditHelper(db: Database.Database) {
  const cache: Record<string, TableInfo> = {};
  return (table: string, rowData: Record<string, unknown>, changeType: AuditChangeType) =>
    recordAudit(db, AUDIT_TABLE_MAP, table, rowData, changeType, cache);
}
