import Database from "better-sqlite3";
import {
  hasColumn,
  runMigrations,
  SHARED_MIGRATIONS,
  SHARED_SCHEMA_VERSION,
  type MigrationConfig,
} from "@monta-vis/db-utils";

/**
 * Bootstrap an unversioned DB (user_version=0) to the v43 baseline.
 * Handles only what the shared v44-v46 migrations don't cover:
 * - Drop has_blurred_version columns (creator v38 equivalent)
 * - Drawings table reconstruction: drop substep_image_id, add video_frame_area_id (creator v40 equivalent)
 *
 * The rename (v44) and column additions (v45) are handled by shared migrations.
 */
function ensureBaseSchema(db: InstanceType<typeof Database>): void {
  // Drop has_blurred_version from video_sections and video_frame_areas
  if (hasColumn(db, "video_sections", "has_blurred_version")) {
    db.exec(
      "ALTER TABLE video_sections DROP COLUMN has_blurred_version",
    );
  }
  if (hasColumn(db, "video_frame_areas", "has_blurred_version")) {
    db.exec(
      "ALTER TABLE video_frame_areas DROP COLUMN has_blurred_version",
    );
  }

  // Drawings table reconstruction: drop substep_image_id, add video_frame_area_id with ON DELETE CASCADE
  const drawingCols = (
    db.pragma("table_info(drawings)") as Array<{
      name: string;
      type: string;
      notnull: number;
    }>
  );

  // If drawings table doesn't exist, nothing to do
  if (drawingCols.length === 0) return;

  const hasSubstepImageId = drawingCols.some(
    (c) => c.name === "substep_image_id",
  );
  const hasVfaId = drawingCols.some(
    (c) => c.name === "video_frame_area_id",
  );

  if (!hasVfaId) {
    db.exec("BEGIN TRANSACTION");
    try {
      db.exec(
        "ALTER TABLE drawings ADD COLUMN video_frame_area_id TEXT REFERENCES video_frame_areas(id)",
      );
      db.exec(`UPDATE drawings SET video_frame_area_id = (
        SELECT si.video_frame_area_id FROM substep_images si WHERE si.id = drawings.substep_image_id
      ) WHERE substep_image_id IS NOT NULL AND video_frame_area_id IS NULL`);
      db.exec("COMMIT");
    } catch (err) {
      try { db.exec("ROLLBACK"); } catch { /* ignore */ }
      throw err;
    }
  }

  if (hasSubstepImageId) {
    db.pragma("foreign_keys = OFF");

    // Re-read columns after potential ALTER TABLE
    const currentCols = (
      db.pragma("table_info(drawings)") as Array<{
        name: string;
        type: string;
        notnull: number;
      }>
    );
    const keptCols = currentCols.filter(
      (c) => c.name !== "substep_image_id",
    );

    // Hardcode known column definitions to avoid interpolating raw SQL expressions
    const knownColumnDefs: Record<string, string> = {
      id: '"id" TEXT PRIMARY KEY',
      instruction_id: '"instruction_id" TEXT REFERENCES instructions(id)',
      video_frame_area_id:
        '"video_frame_area_id" TEXT REFERENCES video_frame_areas(id) ON DELETE CASCADE',
      version_id: '"version_id" TEXT NOT NULL',
      substep_id: '"substep_id" TEXT',
      type: '"type" TEXT NOT NULL',
      path_data: '"path_data" TEXT NOT NULL',
      color: '"color" TEXT NOT NULL',
      stroke_width: '"stroke_width" REAL NOT NULL',
      start_frame: '"start_frame" INTEGER',
      end_frame: '"end_frame" INTEGER',
      '"order"': '"order" INTEGER NOT NULL DEFAULT 0',
      text: '"text" TEXT',
      font_size: '"font_size" REAL',
    };

    const columnDefs = keptCols
      .map((c) => {
        const colKey = c.name === "order" ? '"order"' : c.name;
        const known = knownColumnDefs[colKey];
        if (known) return known;
        // Fallback: validate name/type to prevent injection
        if (
          !/^[a-zA-Z0-9_]+$/.test(c.name) ||
          !/^[a-zA-Z0-9_ ()]+$/.test(c.type)
        ) {
          throw new Error(
            `[ensureBaseSchema] Unexpected column name/type in drawings table: ${c.name} ${c.type}`,
          );
        }
        const nullable = c.notnull ? " NOT NULL" : "";
        return `"${c.name}" ${c.type}${nullable}`;
      })
      .join(", ");
    const colNames = keptCols.map((c) => `"${c.name}"`).join(", ");

    db.exec("BEGIN TRANSACTION");
    try {
      db.exec(`CREATE TABLE drawings_new (${columnDefs})`);
      db.exec(
        `INSERT INTO drawings_new (${colNames}) SELECT ${colNames} FROM drawings`,
      );
      db.exec("DROP TABLE drawings");
      db.exec("ALTER TABLE drawings_new RENAME TO drawings");
      db.exec("COMMIT");
    } catch (err) {
      try {
        db.exec("ROLLBACK");
      } catch {
        /* ignore */
      }
      throw err;
    }
  }

  // Mark as v43 baseline
  db.pragma("user_version = 43");
}

/** Viewer migration config using shared migrations. */
const VIEWER_MIGRATION_CONFIG: MigrationConfig = {
  schemaVersion: SHARED_SCHEMA_VERSION,
  migrations: SHARED_MIGRATIONS,
};

/**
 * Ensure a viewer database is fully migrated.
 * 1. If user_version < 43, run bootstrap to reach v43 baseline
 * 2. Then run shared v44+ migrations via runMigrations (reusing the same connection)
 */
export function ensureViewerMigrated(dbPath: string): void {
  const db = new Database(dbPath);
  try {
    const [{ user_version }] = db.pragma("user_version") as [
      { user_version: number },
    ];

    // Step 1: Bootstrap unversioned DBs to v43
    if (user_version < 43) {
      ensureBaseSchema(db);
    }

    // Step 2: Run shared v44+ migrations (reuses open connection)
    runMigrations(db, VIEWER_MIGRATION_CONFIG);
  } catch (err) {
    console.error("[ensureViewerMigrated] Migration failed:", err);
    throw err;
  } finally {
    db.close();
  }
}
