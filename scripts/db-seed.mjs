// scripts/db-seed.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDbPath, openDb, runMigrations } from "./lib/db.mjs";

const db = openDb();
runMigrations(db);

const seedSql = readFileSync(resolve(process.cwd(), "db/seed.sql"), "utf8");
db.exec("BEGIN");
try {
  db.exec(seedSql);
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}

console.log(`seeded ${getDbPath()}`);
