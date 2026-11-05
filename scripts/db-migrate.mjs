// scripts/db-migrate.mjs

import { getDbPath, openDb, runMigrations } from "./lib/db.mjs";

const db = openDb();
runMigrations(db);
db.close();

console.log(`database ready at ${getDbPath()}`);
