import type { Quiz } from '~/types/quiz';

export const getQuizShortId = (quiz: Quiz): string => {
  // UUIDs and seeded ids both expose their first segment as the lookup prefix.
  return quiz.id ? (quiz.id.split("-")[0] ?? quiz.id) : "";
};

export const getQuizUrl = (quiz: Quiz): string => {
  const slug = (quiz.title || 'quiz')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'quiz';

  return `/quiz/${slug}-${getQuizShortId(quiz)}`;
};

export const extractShortId = (slugParam: string): string => {
  const parts = slugParam.split('-');
  const lastPart = parts[parts.length - 1];
  
  // Use nullish coalescing to guarantee a string return
  return lastPart ?? slugParam;
};