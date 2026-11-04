import { db } from "~/utils/db";
import { generateId } from "~/utils/id";
import type { Quiz, Question, QuestionType } from "~/types/quiz";

export const useQuizDb = () => {
  const formatQuestion = (q: any): Question => {
    const type: QuestionType = q.type || "single";

    return {
      id: q.id || generateId(),
      type,
      text: q.text || "",
      explanation: q.explanation || "",

      // Choice-based questions ('single', 'multiple', 'true_false')
      // Arrays are cloned with spreads so no Vue reactive proxies leak into IndexedDB
      choices:
        type === "true_false"
          ? Array.isArray(q.choices) && q.choices.length >= 2
            ? [...q.choices]
            : ["True", "False"]
          : Array.isArray(q.choices)
            ? [...q.choices]
            : [],

      correctIndices:
        type === "true_false"
          ? Array.isArray(q.correctIndices) && q.correctIndices.length > 0
            ? [q.correctIndices[0]]
            : typeof q.correctIndices === "number"
              ? [q.correctIndices]
              : [0]
          : Array.isArray(q.correctIndices)
            ? [...q.correctIndices]
            : typeof q.correctIndices === "number"
              ? [q.correctIndices]
              : [],

      // Text-based questions ('short_answer')
      acceptedAnswers: Array.isArray(q.acceptedAnswers)
        ? [...q.acceptedAnswers]
        : typeof q.acceptedAnswer === "string"
          ? [q.acceptedAnswer]
          : [],
    };
  };

  const saveImportedQuiz = async (rawQuiz: {
    title: string;
    description?: string;
    questions: any[];
  }) => {
    const now = Date.now();
    const newQuiz: Quiz = {
      id: generateId(),
      title: rawQuiz.title || "Untitled Quiz",
      description: rawQuiz.description || "",
      createdAt: now,
      updatedAt: now,
      questions: (rawQuiz.questions || []).map(formatQuestion),
    };

    await db.quizzes.add(newQuiz);
    return newQuiz.id;
  };

  // Saves a quiz to the local DB, avoiding duplicates:
  // - If a quiz with the same title already exists, it is updated in place (same id, new content).
  // - Otherwise a new quiz is created.
  // Returns whether the quiz was created or updated.
  const upsertImportedQuiz = async (rawQuiz: {
    title: string;
    description?: string;
    questions: any[];
  }): Promise<{ created: boolean; id: string }> => {
    const title = (rawQuiz.title || "Untitled Quiz").trim();
    const existing = await db.quizzes
      .filter((q) => q.title.trim().toLowerCase() === title.toLowerCase())
      .first();

    if (existing) {
      await db.quizzes.update(existing.id, {
        description: rawQuiz.description || "",
        updatedAt: Date.now(),
        questions: (rawQuiz.questions || []).map(formatQuestion),
      });
      return { created: false, id: existing.id };
    }

    const now = Date.now();
    const newQuiz: Quiz = {
      id: generateId(),
      title,
      description: rawQuiz.description || "",
      createdAt: now,
      updatedAt: now,
      questions: (rawQuiz.questions || []).map(formatQuestion),
    };

    await db.quizzes.add(newQuiz);
    return { created: true, id: newQuiz.id };
  };

  const createQuiz = async (rawQuiz: {
    title: string;
    description?: string;
    questions: any[];
  }) => {
    const now = Date.now();
    const newQuiz: Quiz = {
      id: generateId(),
      title: rawQuiz.title || "Untitled Quiz",
      description: rawQuiz.description || "",
      createdAt: now,
      updatedAt: now,
      questions: (rawQuiz.questions || []).map(formatQuestion),
    };

    await db.quizzes.add(newQuiz);
    return newQuiz.id;
  };

  const getQuiz = async (id: string) => db.quizzes.get(id);

  const getQuizByShortId = async (shortId: string) => {
    return db.quizzes.filter((q) => q.id.startsWith(shortId)).first();
  };

  const getAllQuizzes = async () =>
    db.quizzes.orderBy("createdAt").reverse().toArray();

  const updateQuiz = async (id: string, updatedFields: Partial<Quiz>) => {
    const cleanFields: Partial<Quiz> = {
      ...updatedFields,
      updatedAt: Date.now(),
    };

    // Sanitize questions at the storage boundary to avoid writing Vue reactive proxies
    if (Array.isArray(cleanFields.questions)) {
      cleanFields.questions = cleanFields.questions.map(formatQuestion);
    }

    return db.quizzes.update(id, cleanFields);
  };

  const deleteQuiz = async (id: string) => db.quizzes.delete(id);

  return {
    saveImportedQuiz,
    upsertImportedQuiz,
    createQuiz,
    getQuiz,
    getQuizByShortId,
    getAllQuizzes,
    updateQuiz,
    deleteQuiz,
  };
};
