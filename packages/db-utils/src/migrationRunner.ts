import fs from "fs/promises";
import Database from "better-sqlite3";
import type { MigrationConfig } from "./migrationTypes.js";
import type { Logger } from "./types.js";

const defaultLogger: Logger = {
  debug: (...args: unknown[]) => console.debug("[migration]", ...args),
  warn: (...args: unknown[]) => console.warn("[migration]", ...args),
  error: (...args: unknown[]) => console.error("[migration]", ...args),
};

/**
 * Run pending migrations on an open database.
 * Wraps all migrations in a single transaction; rolls back on failure.
 */
export function runMigrations(
  db: InstanceType<typeof Database>,
  config: MigrationConfig,
): void {
  const logger = config.logger ?? defaultLogger;
  const [{ user_version: currentVersion }] = db.pragma("user_version") as [
    { user_version: number },
  ];
  const pending = config.migrations.filter((m) => m.version > currentVersion);

  if (pending.length === 0) return;

  logger.debug(
    `[runMigrations] DB v${currentVersion} → v${config.schemaVersion}, running ${pending.length} migration(s)`,
  );

  db.pragma("foreign_keys = OFF");
  try {
    db.exec("BEGIN");

    for (const migration of pending) {
      logger.debug(
        `[runMigrations] v${migration.version}: ${migration.description}`,
      );
      migration.up(db);
    }

    if (config.postMigrationSql) {
      db.exec(config.postMigrationSql);
    }

    db.pragma(`user_version = ${config.schemaVersion}`);
    db.exec("COMMIT");

    logger.debug(
      `[runMigrations] Completed (v${currentVersion} → v${config.schemaVersion})`,
    );
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* ignore rollback error */
    }
    throw err;
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

/**
 * Ensure a database file is migrated to the target version.
 * Creates a backup before migrating; restores on failure.
 */
export async function ensureMigrated(
  dbPath: string,
  config: MigrationConfig,
): Promise<void> {
  const logger = config.logger ?? defaultLogger;
  const db = new Database(dbPath);
  const [{ user_version: currentVersion }] = db.pragma("user_version") as [
    { user_version: number },
  ];

  if (currentVersion >= config.schemaVersion) {
    db.close();
    return;
  }

  const backupPath = dbPath + ".pre-migration-backup";
  try {
    await fs.copyFile(dbPath, backupPath);
  } catch (backupErr) {
    logger.warn("[ensureMigrated] Could not create backup:", backupErr);
  }

  try {
    runMigrations(db, config);
    db.close();
    // Remove backup on success
    try {
      await fs.unlink(backupPath);
    } catch {
      /* backup may not exist */
    }
  } catch (migrationErr) {
    logger.error("[ensureMigrated] Migration failed:", migrationErr);
    db.close();
    // Restore from backup
    try {
      await fs.copyFile(backupPath, dbPath);
      await fs.unlink(backupPath);
      logger.debug("[ensureMigrated] Restored from pre-migration backup");
    } catch (restoreErr) {
      logger.error("[ensureMigrated] Failed to restore backup:", restoreErr);
    }
    throw migrationErr;
  }
}
