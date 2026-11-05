import { getQuizService } from "../../../utils/quizService";

export default defineEventHandler((event) => {
  const prefix = getRouterParam(event, "prefix");
  const quiz = prefix ? getQuizService().getByShortPrefix(prefix) : null;

  if (!quiz) {
    throw createError({ statusCode: 404, statusMessage: "Quiz not found" });
  }

  return quiz;
});
