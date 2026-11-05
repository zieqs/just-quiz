// shared/quiz.ts
// Domain types, normalisation, and validation shared by the Vue app and Nitro server.

import { generateId } from "./id";

export type QuestionType = "single" | "multiple" | "true_false" | "short_answer";

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  explanation?: string;
  choices?: string[];
  correctIndices?: number[];
  acceptedAnswers?: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  questions: Question[];
}

export interface QuizInput {
  title: string;
  description: string;
  questions: Question[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const VALID_QUESTION_TYPES: QuestionType[] = [
  "single",
  "multiple",
  "true_false",
  "short_answer",
];

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? (value as string[]) : [];

const asNumberArray = (value: unknown): number[] => {
  if (Array.isArray(value)) return value as number[];
  return typeof value === "number" ? [value] : [];
};

const invalidQuestion = (): Question => ({
  id: generateId(),
  type: "single",
  text: "",
  explanation: "",
  choices: [],
  correctIndices: [],
  acceptedAnswers: [],
});

/**
 * Normalise raw JSON or editor output into the shape the database expects.
 * This runs before validation, so documented defaults (true/false choices,
 * scalar answer fields) are applied first. Malformed members are preserved
 * (not dropped or coerced) so validation can report them.
 */
export const normalizeQuiz = (raw: unknown): QuizInput => {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description : "";
  const rawQuestions = Array.isArray(data.questions) ? data.questions : [];

  const questions: Question[] = rawQuestions.map((item) => {
    if (!item || typeof item !== "object") return invalidQuestion();

    const record = item as Record<string, unknown>;
    const type = (typeof record.type === "string" && record.type
      ? record.type
      : "single") as QuestionType;

    const choices = Array.isArray(record.choices)
      ? asStringArray(record.choices)
      : type === "true_false"
        ? ["True", "False"]
        : [];

    const correctIndices = Array.isArray(record.correctIndices)
      ? asNumberArray(record.correctIndices)
      : typeof record.correctIndex === "number"
        ? [record.correctIndex]
        : [];

    const acceptedAnswers = Array.isArray(record.acceptedAnswers)
      ? asStringArray(record.acceptedAnswers)
      : typeof record.acceptedAnswer === "string"
        ? [record.acceptedAnswer]
        : [];

    // Keep only the collections that belong to this question type.
    const isTextAnswer = type === "short_answer";

    return {
      id: typeof record.id === "string" && record.id ? record.id : generateId(),
      type,
      text: typeof record.text === "string" ? record.text : "",
      explanation: typeof record.explanation === "string" ? record.explanation : "",
      choices: isTextAnswer ? [] : choices,
      correctIndices: isTextAnswer ? [] : correctIndices,
      acceptedAnswers: isTextAnswer ? acceptedAnswers : [],
    };
  });

  return { title, description, questions };
};

/** Validate an already-normalised quiz (or raw data that matches the shape). */
export const validateQuizJson = (data: unknown): ValidationResult => {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["JSON must be an object."] };
  }

  const quiz = data as Partial<QuizInput>;

  if (typeof quiz.title !== "string" || !quiz.title.trim()) {
    errors.push('Quiz must have a non-empty "title" string.');
  }

  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    errors.push('Quiz must contain a "questions" array with at least one question.');
    return { valid: false, errors };
  }

  quiz.questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;

    if (!question || typeof question !== "object") {
      errors.push(`${label}: must be an object.`);
      return;
    }

    if (!question.text || typeof question.text !== "string" || !question.text.trim()) {
      errors.push(`${label}: missing "text".`);
      return;
    }

    const type = question.type || "single";
    if (!VALID_QUESTION_TYPES.includes(type)) {
      errors.push(`${label}: unknown type "${type}".`);
      return;
    }

    if (type === "short_answer") {
      const accepted = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [];
      if (accepted.length === 0) {
        errors.push(`${label}: short_answer needs "acceptedAnswers".`);
      } else if (accepted.some((answer) => typeof answer !== "string" || !answer.trim())) {
        errors.push(`${label}: acceptedAnswers must not be blank.`);
      }
      return;
    }

    const choices =
      type === "true_false"
        ? Array.isArray(question.choices) && question.choices.length >= 2
          ? question.choices
          : ["True", "False"]
        : question.choices;

    if (!Array.isArray(choices) || choices.length < 2) {
      errors.push(`${label}: needs at least 2 "choices".`);
      return;
    }

    if (choices.some((choice) => typeof choice !== "string" || !choice.trim())) {
      errors.push(`${label}: choices must not be blank.`);
    }

    const correct = Array.isArray(question.correctIndices) ? question.correctIndices : [];
    if (correct.length === 0) {
      errors.push(`${label}: missing correct answer (correctIndices).`);
    } else if ((type === "single" || type === "true_false") && correct.length !== 1) {
      errors.push(`${label}: ${type} needs exactly one correct answer.`);
    } else if (
      correct.some(
        (choiceIndex) =>
          typeof choiceIndex !== "number" ||
          !Number.isInteger(choiceIndex) ||
          choiceIndex < 0 ||
          choiceIndex >= choices.length
      )
    ) {
      errors.push(`${label}: correctIndices out of range.`);
    }
  });

  return { valid: errors.length === 0, errors };
};
