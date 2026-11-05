import type { DatabaseSync } from "node:sqlite";
import { generateId } from "~~/shared/id";
import type { Question, QuestionType, Quiz, QuizInput } from "~~/shared/quiz";

export interface QuizRepository {
  list(): Quiz[];
  get(id: string): Quiz | null;
  getByShortPrefix(prefix: string): Quiz | null;
  create(input: QuizInput): Quiz;
  update(id: string, input: QuizInput): Quiz | null;
  remove(id: string): boolean;
}

type QuizRow = {
  id: string;
  title: string;
  description: string;
  created_at: number;
  updated_at: number;
};

type QuestionRow = {
  id: string;
  quiz_id: string;
  type: QuestionType;
  text: string;
  explanation: string;
  position: number;
};

type ChoiceRow = { text: string; position: number; is_correct: number };
type AnswerRow = { text: string; position: number };

export const createQuizRepository = (db: DatabaseSync): QuizRepository => {
  const tx = <T>(fn: () => T): T => {
    db.exec("BEGIN");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };

  const get = (id: string): Quiz | null => {
    const quizRow = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(id) as
      | QuizRow
      | undefined;
    if (!quizRow) return null;

    const questionRows = db
      .prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY position")
      .all(id) as QuestionRow[];

    const questions: Question[] = questionRows.map((questionRow) => {
      const choiceRows = db
        .prepare("SELECT text, position, is_correct FROM choices WHERE question_id = ? ORDER BY position")
        .all(questionRow.id) as ChoiceRow[];
      const answerRows = db
        .prepare("SELECT text, position FROM accepted_answers WHERE question_id = ? ORDER BY position")
        .all(questionRow.id) as AnswerRow[];

      return {
        id: questionRow.id,
        type: questionRow.type,
        text: questionRow.text,
        explanation: questionRow.explanation,
        choices: choiceRows.map((row) => row.text),
        correctIndices: choiceRows
          .map((row, index) => (row.is_correct ? index : -1))
          .filter((index) => index >= 0),
        acceptedAnswers: answerRows.map((row) => row.text),
      };
    });

    return {
      id: quizRow.id,
      title: quizRow.title,
      description: quizRow.description,
      createdAt: quizRow.created_at,
      updatedAt: quizRow.updated_at,
      questions,
    };
  };

  const insertQuestions = (quizId: string, questions: Question[]): void => {
    const existingQuestion = db.prepare("SELECT 1 AS found FROM questions WHERE id = ?");
    const insertQuestion = db.prepare(
      `INSERT INTO questions (id, quiz_id, type, text, explanation, position)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertChoice = db.prepare(
      `INSERT INTO choices (question_id, text, position, is_correct)
       VALUES (?, ?, ?, ?)`
    );
    const insertAnswer = db.prepare(
      `INSERT INTO accepted_answers (question_id, text, position)
       VALUES (?, ?, ?)`
    );

    questions.forEach((question, position) => {
      // Reuse a supplied UUID only when it is not already taken elsewhere.
      const questionId =
        question.id && !existingQuestion.get(question.id) ? question.id : generateId();
      const correctIndices = new Set(question.correctIndices ?? []);

      insertQuestion.run(
        questionId,
        quizId,
        question.type,
        question.text,
        question.explanation ?? "",
        position
      );

      (question.choices ?? []).forEach((choice, choicePosition) => {
        if (question.type === "short_answer") return;
        insertChoice.run(questionId, choice, choicePosition, correctIndices.has(choicePosition) ? 1 : 0);
      });

      (question.acceptedAnswers ?? []).forEach((answer, answerPosition) => {
        if (question.type !== "short_answer") return;
        insertAnswer.run(questionId, answer, answerPosition);
      });
    });
  };

  const list = (): Quiz[] => {
    const rows = db
      .prepare("SELECT id FROM quizzes ORDER BY created_at DESC")
      .all() as Array<{ id: string }>;
    return rows.map((row) => get(row.id)).filter((quiz): quiz is Quiz => quiz !== null);
  };

  const create = (input: QuizInput): Quiz => {
    const id = generateId();
    const now = Date.now();

    tx(() => {
      db.prepare(
        `INSERT INTO quizzes (id, title, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(id, input.title, input.description ?? "", now, now);
      insertQuestions(id, input.questions);
    });

    return get(id)!;
  };

  const update = (id: string, input: QuizInput): Quiz | null => {
    if (!get(id)) return null;

    tx(() => {
      db.prepare(
        "UPDATE quizzes SET title = ?, description = ?, updated_at = ? WHERE id = ?"
      ).run(input.title, input.description ?? "", Date.now(), id);
      db.prepare("DELETE FROM questions WHERE quiz_id = ?").run(id);
      insertQuestions(id, input.questions);
    });

    return get(id);
  };

  const remove = (id: string): boolean => {
    const result = db.prepare("DELETE FROM quizzes WHERE id = ?").run(id);
    return Number(result.changes) > 0;
  };

  const getByShortPrefix = (prefix: string): Quiz | null => {
    const rows = db
      .prepare("SELECT id FROM quizzes WHERE substr(id, 1, ?) = ? ORDER BY created_at DESC LIMIT 2")
      .all(prefix.length, prefix) as Array<{ id: string }>;
    // Ambiguous prefixes must not silently resolve to the wrong quiz.
    return rows.length === 1 ? get(rows[0]!.id) : null;
  };

  return { list, get, getByShortPrefix, create, update, remove };
};
