import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runMigrations } from "./migrations";

export const getDbPath = (): string =>
  resolve(process.cwd(), process.env.JUSTQUIZ_DB_PATH || "data/justquiz.db");

export const openDatabase = (path = getDbPath()): DatabaseSync => {
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

let instance: DatabaseSync | null = null;

/** Lazily open the process-wide database and apply pending migrations. */
export const getDb = (): DatabaseSync => {
  if (!instance) {
    instance = openDatabase();
    runMigrations(instance);
  }
  return instance;
};
