import type Database from "better-sqlite3";
import type { ProjectChanges, SaveConfig, SaveResult, TableInfo } from "./types.js";
import { assertValidIdentifier, getTableInfo, toSqliteValue } from "./sqlHelpers.js";
import { recordAudit } from "./audit.js";

/**
 * Build a column fingerprint for statement caching — rows with the same
 * set of valid columns can share the same prepared statement.
 */
function columnFingerprint(cols: string[]): string {
  return cols.join(",");
}

/**
 * Save changes to a project's SQLite database.
 *
 * The `db` handle must already be open — the caller is responsible for
 * open/close and path resolution. This function runs everything inside
 * a single transaction (COMMIT on success, ROLLBACK on error).
 */
export function saveProjectData(
  db: Database.Database,
  changes: ProjectChanges,
  config: SaveConfig,
): SaveResult {
  const {
    allowedTables,
    deleteOrder,
    auditTableMap,
    sourceLanguageBackfillTables,
    cleanupTranslationsOnDelete = true,
  } = config;

  try {
    db.pragma("foreign_keys = ON");
    db.exec("BEGIN TRANSACTION");

    try {
      const tableInfoCache: Record<string, TableInfo> = {};

      // ── UPSERT changed rows ──
      for (const [key, rows] of Object.entries(changes.changed)) {
        const targetTable = key === "instruction" ? "instructions" : key;
        if (!allowedTables.has(key) && key !== "instruction") continue;

        assertValidIdentifier(targetTable);

        const { columns: tableColumns, pkColumns } = getTableInfo(db, targetTable, tableInfoCache);
        if (tableColumns.size === 0) continue;

        // Cache prepared statements by column fingerprint
        const stmtCache = new Map<string, Database.Statement>();
        // Cache existence-check statement for audit (one per table)
        let existenceStmt: Database.Statement | undefined;
        if (auditTableMap && pkColumns.length > 0) {
          const pkWhere = pkColumns.map((c) => `"${c}" = ?`).join(" AND ");
          existenceStmt = db.prepare(
            `SELECT 1 FROM "${targetTable}" WHERE ${pkWhere}`,
          );
        }

        // Track upserted instruction IDs for scoped updated_at
        const upsertedInstructionIds: unknown[] = [];

        for (const row of rows) {
          // Determine if this is an insert or update (for audit)
          let isExisting = false;
          if (existenceStmt && pkColumns.length > 0) {
            const pkValues = pkColumns.map((c) => row[c] ?? null);
            isExisting = !!existenceStmt.get(...pkValues);
          }

          const cols = Object.keys(row).filter((k) => tableColumns.has(k));
          if (cols.length === 0) continue;

          // Reuse prepared statement for rows with the same column shape
          const fp = columnFingerprint(cols);
          let stmt = stmtCache.get(fp);
          if (!stmt) {
            const quotedCols = cols.map((c) => `"${c}"`);
            const placeholders = cols.map(() => "?");
            const pkSet = new Set(pkColumns);
            const updateSet = cols
              .filter((c) => !pkSet.has(c))
              .map((c) => `"${c}" = excluded."${c}"`);

            const conflictTarget = pkColumns.map((c) => `"${c}"`).join(", ");
            const sql =
              updateSet.length > 0 && pkColumns.length > 0
                ? `INSERT INTO "${targetTable}" (${quotedCols.join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT(${conflictTarget}) DO UPDATE SET ${updateSet.join(", ")}`
                : `INSERT OR IGNORE INTO "${targetTable}" (${quotedCols.join(", ")}) VALUES (${placeholders.join(", ")})`;

            stmt = db.prepare(sql);
            stmtCache.set(fp, stmt);
          }

          const values = cols.map((c) => toSqliteValue(row[c]));
          stmt.run(...values);

          // Track instruction IDs for scoped updated_at
          if (key === "instruction" && pkColumns.length > 0) {
            upsertedInstructionIds.push(row[pkColumns[0]] ?? null);
          }

          // Audit
          if (auditTableMap) {
            const auditData: Record<string, unknown> = {};
            for (const c of cols) {
              auditData[c] = toSqliteValue(row[c]);
            }
            recordAudit(
              db,
              auditTableMap,
              key === "instruction" ? "instructions" : key,
              auditData,
              isExisting ? "update" : "create",
              tableInfoCache,
            );
          }
        }

        // Update updated_at scoped to the upserted instruction rows
        if (key === "instruction" && upsertedInstructionIds.length > 0) {
          const placeholders = upsertedInstructionIds.map(() => "?").join(", ");
          db.prepare(
            `UPDATE instructions SET updated_at = datetime('now') WHERE id IN (${placeholders})`,
          ).run(...upsertedInstructionIds);
        }
      }

      // ── DELETE rows ──
      const deletedEntries = Object.entries(changes.deleted);
      // Pre-build order index for O(1) lookups during sort
      const orderIndex = new Map<string, number>();
      for (let i = 0; i < deleteOrder.length; i++) {
        orderIndex.set(deleteOrder[i], i);
      }
      deletedEntries.sort((a, b) => {
        const tA = a[0].replace(/_ids$/, "");
        const tB = b[0].replace(/_ids$/, "");
        return (orderIndex.get(tA) ?? 999) - (orderIndex.get(tB) ?? 999);
      });

      // Prepare translation cleanup statement once (if needed)
      let deleteTranslationsStmt: Database.Statement | undefined;
      if (cleanupTranslationsOnDelete) {
        try {
          deleteTranslationsStmt = db.prepare(
            "DELETE FROM translations WHERE entity_id = ?",
          );
        } catch {
          // translations table may not exist — skip
        }
      }

      for (const [key, ids] of deletedEntries) {
        const table = key.replace(/_ids$/, "");
        if (!allowedTables.has(table)) continue;

        assertValidIdentifier(table);

        // Use PK-aware delete (consistent with upsert)
        const { pkColumns } = getTableInfo(db, table, tableInfoCache);
        const pkCol = pkColumns.length > 0 ? pkColumns[0] : "id";
        const deleteStmt = db.prepare(`DELETE FROM "${table}" WHERE "${pkCol}" = ?`);

        for (const id of ids) {
          // Audit before delete — snapshot the full row
          if (auditTableMap) {
            try {
              const row = db
                .prepare(`SELECT * FROM "${table}" WHERE "${pkCol}" = ?`)
                .get(id) as Record<string, unknown> | undefined;
              if (row) {
                recordAudit(db, auditTableMap, table, row, "delete", tableInfoCache);
              }
            } catch {
              // If SELECT fails, still record minimal audit
              recordAudit(db, auditTableMap, table, { [pkCol]: id }, "delete", tableInfoCache);
            }
          }

          deleteStmt.run(id);

          // Clean up associated translations
          if (deleteTranslationsStmt) {
            deleteTranslationsStmt.run(id);
          }
        }
      }

      // ── Source language backfill ──
      if (sourceLanguageBackfillTables && sourceLanguageBackfillTables.length > 0) {
        const instrRow = db
          .prepare("SELECT source_language FROM instructions LIMIT 1")
          .get() as { source_language: string } | undefined;
        const sourceLang = instrRow?.source_language ?? "de";

        for (const table of sourceLanguageBackfillTables) {
          assertValidIdentifier(table);
          try {
            db.prepare(
              `UPDATE "${table}" SET source_language = ? WHERE source_language IS NULL`,
            ).run(sourceLang);
          } catch {
            // Table may not have source_language column — skip
          }
        }
      }

      db.exec("COMMIT");
      return { success: true };
    } catch (txErr) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // DB may already be closed or in bad state
      }
      throw txErr;
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
