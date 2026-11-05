import { describe, expect, it } from "vitest";
import { normalizeQuiz, validateQuizJson } from "~~/shared/quiz";

const valid = {
  title: "Capitals",
  questions: [
    { type: "single", text: "Q1", choices: ["A", "B"], correctIndices: [0] },
    { type: "short_answer", text: "Q2", acceptedAnswers: ["Paris"] },
  ],
};

describe("normalizeQuiz", () => {
  it("defaults true_false choices to True/False", () => {
    const quiz = normalizeQuiz({
      title: "T",
      questions: [{ type: "true_false", text: "Q", correctIndices: [0] }],
    });
    expect(quiz.questions[0]!.choices).toEqual(["True", "False"]);
    expect(validateQuizJson(quiz).valid).toBe(true);
  });

  it("coerces scalar correctIndex and acceptedAnswer to arrays", () => {
    const quiz = normalizeQuiz({
      title: "T",
      questions: [
        { type: "single", text: "Q", choices: ["A", "B"], correctIndex: 1 },
        { type: "short_answer", text: "S", acceptedAnswer: "x" },
      ],
    });
    expect(quiz.questions[0]!.correctIndices).toEqual([1]);
    expect(quiz.questions[1]!.acceptedAnswers).toEqual(["x"]);
  });

  it("generates ids when missing", () => {
    const quiz = normalizeQuiz(valid);
    expect(quiz.questions.every((q) => typeof q.id === "string" && q.id.length > 0)).toBe(true);
  });
});

describe("validateQuizJson", () => {
  it("accepts a valid quiz", () =>
    expect(validateQuizJson(normalizeQuiz(valid)).valid).toBe(true));

  it("rejects a missing title", () =>
    expect(validateQuizJson(normalizeQuiz({ questions: valid.questions })).errors.join()).toMatch(/title/i));

  it("rejects empty questions", () =>
    expect(validateQuizJson(normalizeQuiz({ title: "T", questions: [] })).valid).toBe(false));

  it("rejects an unknown type", () =>
    expect(
      validateQuizJson(normalizeQuiz({ title: "T", questions: [{ type: "essay", text: "Q" }] })).errors.join()
    ).toMatch(/unknown type/i));

  it("rejects fewer than two choices", () =>
    expect(
      validateQuizJson(
        normalizeQuiz({ title: "T", questions: [{ type: "single", text: "Q", choices: ["A"], correctIndices: [0] }] })
      ).valid
    ).toBe(false));

  it("rejects out-of-range correct indices", () =>
    expect(
      validateQuizJson(
        normalizeQuiz({ title: "T", questions: [{ type: "single", text: "Q", choices: ["A", "B"], correctIndices: [5] }] })
      ).valid
    ).toBe(false));

  it("rejects blank choice text", () =>
    expect(
      validateQuizJson(
        normalizeQuiz({ title: "T", questions: [{ type: "single", text: "Q", choices: ["A", "  "], correctIndices: [0] }] })
      ).errors.join()
    ).toMatch(/choice/i));

  it("rejects short_answer without accepted answers", () =>
    expect(
      validateQuizJson(normalizeQuiz({ title: "T", questions: [{ type: "short_answer", text: "Q" }] })).valid
    ).toBe(false));

  it("rejects a non-object question entry instead of dropping it", () =>
    expect(
      validateQuizJson(normalizeQuiz({ title: "T", questions: [null, { type: "single", text: "Q", choices: ["A", "B"], correctIndices: [0] }] })).valid
    ).toBe(false));

  it("rejects a non-string choice instead of coercing it", () =>
    expect(
      validateQuizJson(
        normalizeQuiz({ title: "T", questions: [{ type: "single", text: "Q", choices: [1, "B"], correctIndices: [0] }] })
      ).errors.join()
    ).toMatch(/choice/i));

  it("rejects a non-number correct index", () =>
    expect(
      validateQuizJson(
        normalizeQuiz({ title: "T", questions: [{ type: "single", text: "Q", choices: ["A", "B"], correctIndices: ["0"] }] })
      ).valid
    ).toBe(false));

  it("rejects a fractional correct index", () =>
    expect(
      validateQuizJson(
        normalizeQuiz({ title: "T", questions: [{ type: "single", text: "Q", choices: ["A", "B"], correctIndices: [0.5] }] })
      ).valid
    ).toBe(false));

  it("rejects multiple correct answers for single choice", () =>
    expect(
      validateQuizJson(
        normalizeQuiz({ title: "T", questions: [{ type: "single", text: "Q", choices: ["A", "B"], correctIndices: [0, 1] }] })
      ).valid
    ).toBe(false));

  it("rejects multiple correct answers for true/false", () =>
    expect(
      validateQuizJson(
        normalizeQuiz({ title: "T", questions: [{ type: "true_false", text: "Q", correctIndices: [0, 1] }] })
      ).valid
    ).toBe(false));

  it("strips choice fields from short_answer during normalisation", () => {
    const quiz = normalizeQuiz({
      title: "T",
      questions: [
        { type: "short_answer", text: "Q", choices: ["A", "B"], correctIndices: [0], acceptedAnswers: ["x"] },
      ],
    });
    expect(quiz.questions[0]!.choices).toEqual([]);
    expect(quiz.questions[0]!.correctIndices).toEqual([]);
    expect(validateQuizJson(quiz).valid).toBe(true);
  });

  it("validates scalar aliases after normalisation", () =>
    expect(
      validateQuizJson(
        normalizeQuiz({
          title: "T",
          questions: [
            { type: "single", text: "Q", choices: ["A", "B"], correctIndex: 1 },
            { type: "short_answer", text: "S", acceptedAnswer: "x" },
          ],
        })
      ).valid
    ).toBe(true));
});
