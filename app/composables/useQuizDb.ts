import { normalizeQuiz, type Quiz, type QuizInput } from "~~/shared/quiz";
import { createQuizApi, type QuizFetcher } from "~/utils/quizApi";

export const useQuizDb = () => {
  const api = createQuizApi($fetch as unknown as QuizFetcher);

  const saveImportedQuiz = async (rawQuiz: QuizInput) => (await api.create(rawQuiz)).id;

  const createQuiz = async (rawQuiz: QuizInput) => (await api.create(rawQuiz)).id;

  const getQuiz = async (id: string) => api.get(id);

  const getQuizByShortId = async (shortId: string): Promise<Quiz | null> => {
    try {
      return await api.getByShortId(shortId);
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.status === 404) return null;
      throw error;
    }
  };

  const getAllQuizzes = async () => api.list();

  const updateQuiz = async (id: string, updatedFields: Partial<Quiz>) =>
    api.updatePartial(id, updatedFields);

  const deleteQuiz = async (id: string) => api.remove(id);

  // Temporary shim for the Drive merge flow, removed with Drive in Task 10.
  const upsertImportedQuiz = async (rawQuiz: QuizInput | Quiz) => {
    const title = (rawQuiz.title || "Untitled Quiz").trim().toLowerCase();
    const existing = (await api.list()).find(
      (quiz) => quiz.title.trim().toLowerCase() === title
    );
    const normalized = normalizeQuiz(rawQuiz);

    if (existing) {
      await api.update(existing.id, normalized);
      return { created: false, id: existing.id };
    }

    const { id } = await api.create(normalized);
    return { created: true, id };
  };

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
