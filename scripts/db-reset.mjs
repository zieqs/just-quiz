// scripts/db-reset.mjs

import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { getDbPath, openDb, runMigrations } from "./lib/db.mjs";

const dbPath = getDbPath();

for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  rmSync(`${dbPath}${suffix}`, { force: true });
}

const db = openDb(dbPath);
runMigrations(db);
db.close();

execFileSync(process.execPath, ["scripts/db-seed.mjs"], { stdio: "inherit" });

console.log("reset complete");
