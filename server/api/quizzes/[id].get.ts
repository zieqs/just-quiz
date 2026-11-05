import { getQuizService } from "../../utils/quizService";

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id");
  const quiz = id ? getQuizService().get(id) : null;

  if (!quiz) {
    throw createError({ statusCode: 404, statusMessage: "Quiz not found" });
  }

  return quiz;
});
