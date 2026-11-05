// scripts/db-migrate.mjs
// Plain-Node migration runner so setup does not depend on TypeScript tooling.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const dbPath = resolve(process.cwd(), process.env.JUSTQUIZ_DB_PATH || "data/justquiz.db");
mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");
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
  if (applied.has(file)) {
    console.log(`skip ${file}`);
    continue;
  }

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

db.close();
console.log(`database ready at ${dbPath}`);
