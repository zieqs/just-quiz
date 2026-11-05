import type { Quiz, QuizInput } from "~~/shared/quiz";

export type QuizFetcher = <T = any>(
  url: string,
  options?: { method?: string; body?: unknown }
) => Promise<T>;

export interface QuizApi {
  list(): Promise<Quiz[]>;
  get(id: string): Promise<Quiz>;
  getByShortId(shortId: string): Promise<Quiz>;
  create(input: QuizInput): Promise<{ id: string }>;
  update(id: string, input: QuizInput): Promise<{ id: string }>;
  updatePartial(id: string, partial: Partial<Quiz>): Promise<{ id: string }>;
  remove(id: string): Promise<void>;
}

const toQuizError = (error: unknown): never => {
  const errors =
    (error as any)?.data?.errors ?? (error as any)?.data?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  throw error;
};

export const createQuizApi = (fetcher: QuizFetcher, base = "/api"): QuizApi => {
  const request = async <T>(url: string, options?: { method?: string; body?: unknown }) => {
    try {
      return await fetcher<T>(url, options);
    } catch (error) {
      return toQuizError(error);
    }
  };

  const get = (id: string) => request<Quiz>(`${base}/quizzes/${encodeURIComponent(id)}`);

  return {
    list: () => request<Quiz[]>(`${base}/quizzes`),
    get,
    getByShortId: (shortId) =>
      request<Quiz>(`${base}/quizzes/short/${encodeURIComponent(shortId)}`),
    create: (input) => request<{ id: string }>(`${base}/quizzes`, { method: "POST", body: input }),
    update: (id, input) =>
      request<{ id: string }>(`${base}/quizzes/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: input,
      }),
    updatePartial: async (id, partial) => {
      const current = await get(id);
      return request<{ id: string }>(`${base}/quizzes/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: {
          title: partial.title ?? current.title,
          description: partial.description ?? current.description ?? "",
          questions: partial.questions ?? current.questions,
        } satisfies QuizInput,
      });
    },
    remove: async (id) => {
      await request<null>(`${base}/quizzes/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  };
};
