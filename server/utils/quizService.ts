import { normalizeQuiz, validateQuizJson, type Quiz } from "~~/shared/quiz";
import { getDb } from "./db";
import { createQuizRepository, type QuizRepository } from "./quizRepository";

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export interface QuizService {
  list(): Quiz[];
  get(id: string): Quiz | null;
  getByShortPrefix(prefix: string): Quiz | null;
  create(raw: unknown): ServiceResult<Quiz>;
  update(id: string, raw: unknown): ServiceResult<Quiz | null>;
  remove(id: string): boolean;
}

export const createQuizService = (repo: QuizRepository): QuizService => {
  const create = (raw: unknown): ServiceResult<Quiz> => {
    const normalized = normalizeQuiz(raw);
    const validation = validateQuizJson(normalized);
    if (!validation.valid) return { ok: false, errors: validation.errors };
    return { ok: true, value: repo.create(normalized) };
  };

  const update = (id: string, raw: unknown): ServiceResult<Quiz | null> => {
    const normalized = normalizeQuiz(raw);
    const validation = validateQuizJson(normalized);
    if (!validation.valid) return { ok: false, errors: validation.errors };
    return { ok: true, value: repo.update(id, normalized) };
  };

  return {
    list: () => repo.list(),
    get: (id) => repo.get(id),
    getByShortPrefix: (prefix) => repo.getByShortPrefix(prefix),
    create,
    update,
    remove: (id) => repo.remove(id),
  };
};

let instance: QuizService | null = null;

export const getQuizService = (): QuizService => {
  if (!instance) {
    instance = createQuizService(createQuizRepository(getDb()));
  }
  return instance;
};
