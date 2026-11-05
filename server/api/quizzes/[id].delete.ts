import { getQuizService } from "../../utils/quizService";

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id");

  if (!id || !getQuizService().remove(id)) {
    throw createError({ statusCode: 404, statusMessage: "Quiz not found" });
  }

  setResponseStatus(event, 204);
  return null;
});
