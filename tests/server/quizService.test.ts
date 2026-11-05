import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "~~/server/utils/db";
import { runMigrations } from "~~/server/utils/migrations";
import { createQuizRepository } from "~~/server/utils/quizRepository";
import { createQuizService } from "~~/server/utils/quizService";

let db: DatabaseSync;
let service: ReturnType<typeof createQuizService>;

const raw = {
  title: "Capitals",
  questions: [
    { type: "single", text: "Q1", choices: ["A", "B"], correctIndices: [1] },
  ],
};

beforeEach(() => {
  db = openDatabase(":memory:");
  runMigrations(db);
  service = createQuizService(createQuizRepository(db));
});

afterEach(() => db.close());

describe("quizService", () => {
  it("creates a valid quiz", () => {
    const result = service.create(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("Capitals");
    expect(service.list()).toHaveLength(1);
  });

  it("rejects an invalid quiz without writing", () => {
    const result = service.create({ title: "", questions: [] });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
    expect(service.list()).toHaveLength(0);
  });

  it("replaces quiz content on update", () => {
    const created = service.create(raw);
    if (!created.ok) throw new Error("create failed");

    const result = service.update(created.value.id, {
      title: "Updated",
      questions: [
        { type: "short_answer", text: "New", acceptedAnswers: ["x"] },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.title).toBe("Updated");
    expect(result.value?.questions).toHaveLength(1);
    expect(result.value?.questions[0]!.text).toBe("New");
  });

  it("leaves the quiz unchanged when an update is invalid", () => {
    const created = service.create(raw);
    if (!created.ok) throw new Error("create failed");

    const result = service.update(created.value.id, { title: "", questions: [] });

    expect(result.ok).toBe(false);
    expect(service.get(created.value.id)?.title).toBe("Capitals");
    expect(service.get(created.value.id)?.questions).toHaveLength(1);
  });

  it("removes a quiz once", () => {
    const created = service.create(raw);
    if (!created.ok) throw new Error("create failed");

    expect(service.remove(created.value.id)).toBe(true);
    expect(service.remove(created.value.id)).toBe(false);
  });

  it("resolves a quiz by its short id", () => {
    const created = service.create(raw);
    if (!created.ok) throw new Error("create failed");

    expect(service.getByShortPrefix(created.value.id.slice(0, 8))?.id).toBe(created.value.id);
  });
});
