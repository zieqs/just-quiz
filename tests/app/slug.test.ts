import { describe, expect, it } from "vitest";
import { getQuizShortId, getQuizUrl } from "~/utils/slug";
import type { Quiz } from "~~/shared/quiz";

const quiz = (id: string, title = "World Capitals Quiz"): Quiz => ({
  id,
  title,
  description: "",
  createdAt: 1,
  updatedAt: 1,
  questions: [],
});

describe("slug helpers", () => {
  it("takes the first id segment for UUID ids", () => {
    expect(getQuizShortId(quiz("2d98206c-cf4c-453a-8d7a-3e46b32f78ae"))).toBe("2d98206c");
  });

  it("takes the first id segment for seeded ids", () => {
    expect(getQuizShortId(quiz("seed-world-capitals"))).toBe("seed");
  });

  it("builds the same short id into the play URL", () => {
    expect(getQuizUrl(quiz("seed-world-capitals"))).toBe("/quiz/world-capitals-quiz-seed");
  });
});
