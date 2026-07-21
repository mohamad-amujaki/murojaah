/**
 * One-off data migration: copies rows from the production SQLite file into the
 * mu_-prefixed MySQL tables. Run once after the MySQL schema migration has
 * been applied. Usage:
 *   node scripts/migrate-sqlite-to-mysql.mjs /path/to/murojaah-prod.db
 *
 * mu_surahs / mu_ayahs are skipped — they're static reference data already
 * loaded by the quran-full.mysql.sql seed (same source, same ids).
 */
import Database from "better-sqlite3";
import mysql from "mysql2/promise";

const sqlitePath = process.argv[2];
if (!sqlitePath) {
  console.error("Usage: node scripts/migrate-sqlite-to-mysql.mjs <path-to-sqlite-file>");
  process.exit(1);
}

// Order doesn't strictly matter (FK checks are disabled during import), but
// keeping parents before children makes the log readable.
const TABLES = [
  "users", "credentials", "oauth_accounts", "sessions", "refresh_tokens", "password_reset_tokens",
  "classes", "class_members", "parent_children", "assignments",
  "practice_sessions", "ayah_progress", "badges", "user_badges", "xp_ledger", "encouragements",
];

const sqlite = new Database(sqlitePath, { readonly: true });
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? "3306", 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  await pool.query("SET FOREIGN_KEY_CHECKS=0");

  const existingTables = new Set(
    sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name),
  );

  for (const table of TABLES) {
    if (!existingTables.has(table)) {
      console.log(`- ${table}: table not present in source db, skipped`);
      continue;
    }
    const mysqlTable = `mu_${table}`;
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
    if (rows.length === 0) {
      console.log(`- ${table}: 0 rows, skipped`);
      continue;
    }
    const columns = Object.keys(rows[0]);
    const placeholders = `(${columns.map(() => "?").join(",")})`;
    const insertSql = `INSERT INTO \`${mysqlTable}\` (${columns.map((c) => `\`${c}\``).join(",")}) VALUES ${placeholders}`;
    for (const row of rows) {
      await pool.query(insertSql, columns.map((c) => row[c]));
    }
    console.log(`✓ ${table}: ${rows.length} rows copied`);

    const hasIdColumn = columns.includes("id");
    if (hasIdColumn) {
      const maxId = Math.max(...rows.map((r) => r.id));
      await pool.query(`ALTER TABLE \`${mysqlTable}\` AUTO_INCREMENT = ${maxId + 1}`);
    }
  }

  await pool.query("SET FOREIGN_KEY_CHECKS=1");
  console.log("Done.");
} catch (e) {
  console.error("✘ Migration failed:", e.message);
  process.exit(1);
} finally {
  sqlite.close();
  await pool.end();
}
