import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "~~/server/utils/db";
import { runMigrations } from "~~/server/utils/migrations";
import { createQuizRepository } from "~~/server/utils/quizRepository";
import type { QuizInput } from "~~/shared/quiz";

let db: DatabaseSync;
let repo: ReturnType<typeof createQuizRepository>;

const input = (): QuizInput => ({
  title: "Capitals",
  description: "d",
  questions: [
    { id: "q-single", type: "single", text: "Q1", choices: ["A", "B"], correctIndices: [1] },
    { id: "q-multi", type: "multiple", text: "Q2", choices: ["A", "B", "C"], correctIndices: [0, 2] },
    { id: "q-tf", type: "true_false", text: "Q3", choices: ["True", "False"], correctIndices: [0] },
    { id: "q-short", type: "short_answer", text: "Q4", acceptedAnswers: ["Paris", "paris"] },
  ],
});

beforeEach(() => {
  db = openDatabase(":memory:");
  runMigrations(db);
  repo = createQuizRepository(db);
});

afterEach(() => db.close());

describe("quizRepository", () => {
  it("round-trips every question type in order", () => {
    const created = repo.create(input());
    const loaded = repo.get(created.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.title).toBe("Capitals");
    expect(loaded!.description).toBe("d");
    expect(loaded!.questions.map((q) => q.id)).toEqual(["q-single", "q-multi", "q-tf", "q-short"]);
    expect(loaded!.questions[0]!.correctIndices).toEqual([1]);
    expect(loaded!.questions[1]!.correctIndices).toEqual([0, 2]);
    expect(loaded!.questions[2]!.correctIndices).toEqual([0]);
    expect(loaded!.questions[3]!.acceptedAnswers).toEqual(["Paris", "paris"]);
    expect(typeof loaded!.createdAt).toBe("number");
    expect(typeof loaded!.updatedAt).toBe("number");
  });

  it("creates a copy with fresh question ids when ids already exist", () => {
    const first = repo.create(input());
    const second = repo.create(input());

    expect(second.id).not.toBe(first.id);
    expect(second.questions.map((q) => q.id)).not.toEqual(first.questions.map((q) => q.id));
    expect(repo.list()).toHaveLength(2);
  });

  it("lists newest first", async () => {
    const first = repo.create({ ...input(), title: "First" });
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = repo.create({ ...input(), title: "Second" });

    expect(repo.list().map((q) => q.id)).toEqual([second.id, first.id]);
  });

  it("replaces children on update and preserves createdAt", () => {
    const created = repo.create(input());
    const replacement: QuizInput = {
      title: "Replaced",
      description: "",
      questions: [
        { id: "new-q1", type: "single", text: "Only", choices: ["A", "B"], correctIndices: [0] },
        { id: "new-q2", type: "short_answer", text: "Text", acceptedAnswers: ["x"] },
      ],
    };

    const updated = repo.update(created.id, replacement)!;

    expect(updated.title).toBe("Replaced");
    expect(updated.questions).toHaveLength(2);
    expect(updated.questions.map((q) => q.text)).toEqual(["Only", "Text"]);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.createdAt);
    expect(repo.get(created.id)!.questions.some((q) => q.id === "q-single")).toBe(false);
  });

  it("returns null when updating a missing quiz", () => {
    expect(repo.update("missing", input())).toBeNull();
  });

  it("cascades deletes to all child tables", () => {
    const created = repo.create(input());

    expect(repo.remove(created.id)).toBe(true);
    expect(repo.get(created.id)).toBeNull();

    for (const table of ["questions", "choices", "accepted_answers"]) {
      const row: any = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get();
      expect(row.n).toBe(0);
    }
  });

  it("returns false when removing a missing quiz", () => {
    expect(repo.remove("missing")).toBe(false);
  });

  it("resolves a quiz by an id prefix", () => {
    const created = repo.create(input());
    expect(repo.getByShortPrefix(created.id.slice(0, 8))?.id).toBe(created.id);
    expect(repo.getByShortPrefix("nonexistent")).toBeNull();
  });

  it("returns null for an ambiguous prefix instead of picking one", () => {
    const first = repo.create({ title: "A", description: "", questions: [] });
    const second = repo.create({ title: "B", description: "", questions: [] });

    db.prepare("UPDATE quizzes SET id = ? WHERE id = ?").run(
      "abcdef12-1111-4000-8000-000000000001",
      first.id
    );
    db.prepare("UPDATE quizzes SET id = ? WHERE id = ?").run(
      "abcdef12-2222-4000-8000-000000000002",
      second.id
    );

    expect(repo.getByShortPrefix("abcdef12")).toBeNull();
    expect(repo.getByShortPrefix("abcdef12-1111")?.id).toBe(
      "abcdef12-1111-4000-8000-000000000001"
    );
  });

  it("treats LIKE wildcards in a prefix literally", () => {
    repo.create(input());
    expect(repo.getByShortPrefix("%")).toBeNull();
    expect(repo.getByShortPrefix("_")).toBeNull();
  });

  it("stores only the child collection that matches the question type", () => {
    const created = repo.create({
      title: "Mixed",
      description: "",
      questions: [
        {
          id: "s1",
          type: "short_answer",
          text: "S",
          choices: ["A", "B"],
          correctIndices: [0],
          acceptedAnswers: ["x"],
        },
        {
          id: "c1",
          type: "single",
          text: "C",
          choices: ["A", "B"],
          correctIndices: [1],
          acceptedAnswers: ["y"],
        },
      ],
    });

    const loaded = repo.get(created.id)!;
    expect(loaded.questions[0]!.choices).toEqual([]);
    expect(loaded.questions[0]!.correctIndices).toEqual([]);
    expect(loaded.questions[0]!.acceptedAnswers).toEqual(["x"]);
    expect(loaded.questions[1]!.acceptedAnswers).toEqual([]);

    const shortChoices: any = db
      .prepare("SELECT COUNT(*) AS n FROM choices WHERE question_id = 's1'")
      .get();
    const choiceAnswers: any = db
      .prepare("SELECT COUNT(*) AS n FROM accepted_answers WHERE question_id = 'c1'")
      .get();
    expect(shortChoices.n).toBe(0);
    expect(choiceAnswers.n).toBe(0);
  });
});
