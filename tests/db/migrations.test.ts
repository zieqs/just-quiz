import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "~~/server/utils/db";
import { runMigrations } from "~~/server/utils/migrations";

let db: ReturnType<typeof openDatabase> | null = null;
afterEach(() => {
  db?.close();
  db = null;
});

describe("runMigrations", () => {
  it("creates the domain tables, indexes, and view", () => {
    db = openDatabase(":memory:");
    runMigrations(db);
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view')")
      .all()
      .map((row: any) => row.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "quizzes",
        "questions",
        "choices",
        "accepted_answers",
        "schema_migrations",
        "quiz_overview",
      ])
    );
  });

  it("is idempotent", () => {
    db = openDatabase(":memory:");
    runMigrations(db);
    runMigrations(db);
    const row: any = db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get();
    expect(row.n).toBe(1);
  });

  it("enables foreign keys", () => {
    db = openDatabase(":memory:");
    const row: any = db.prepare("PRAGMA foreign_keys").get();
    expect(row.foreign_keys).toBe(1);
  });
});
