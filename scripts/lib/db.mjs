// scripts/lib/db.mjs
// Shared plain-Node database helpers for the seed/reset/migrate scripts.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const getDbPath = () =>
  resolve(process.cwd(), process.env.JUSTQUIZ_DB_PATH || "data/justquiz.db");

export const openDb = (path = getDbPath()) => {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  if (path !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL");
  }
  return db;
};

export const runMigrations = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);

  const applied = new Set(
    db.prepare("SELECT version FROM schema_migrations").all().map((row) => row.version)
  );

  const migrationsDir = resolve(process.cwd(), "db/migrations");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        file,
        Date.now()
      );
      db.exec("COMMIT");
      console.log(`applied ${file}`);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
};
