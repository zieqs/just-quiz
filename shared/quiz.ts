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
  Array.isArray(value) ? value.map((item) => String(item)) : [];

const asNumberArray = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is number => typeof item === "number");
  }
  return typeof value === "number" ? [value] : [];
};

/**
 * Normalise raw JSON or editor output into the shape the database expects.
 * This runs before validation, so documented defaults (true/false choices,
 * scalar answer fields) are applied first.
 */
export const normalizeQuiz = (raw: unknown): QuizInput => {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description : "";
  const rawQuestions = Array.isArray(data.questions) ? data.questions : [];

  const questions: Question[] = rawQuestions
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const type = (typeof item.type === "string" && item.type ? item.type : "single") as QuestionType;

      const choices =
        type === "true_false"
          ? Array.isArray(item.choices) && item.choices.length >= 2
            ? asStringArray(item.choices)
            : ["True", "False"]
          : asStringArray(item.choices);

      const correctIndices = Array.isArray(item.correctIndices)
        ? asNumberArray(item.correctIndices)
        : typeof item.correctIndex === "number"
          ? [item.correctIndex]
          : [];

      const acceptedAnswers = Array.isArray(item.acceptedAnswers)
        ? asStringArray(item.acceptedAnswers)
        : typeof item.acceptedAnswer === "string"
          ? [item.acceptedAnswer]
          : [];

      return {
        id: typeof item.id === "string" && item.id ? item.id : generateId(),
        type,
        text: typeof item.text === "string" ? item.text : "",
        explanation: typeof item.explanation === "string" ? item.explanation : "",
        choices,
        correctIndices,
        acceptedAnswers,
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
    } else if (
      correct.some(
        (choiceIndex) =>
          typeof choiceIndex !== "number" || choiceIndex < 0 || choiceIndex >= choices.length
      )
    ) {
      errors.push(`${label}: correctIndices out of range.`);
    }
  });

  return { valid: errors.length === 0, errors };
};
