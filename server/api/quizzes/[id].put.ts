import { getQuizService } from "../../utils/quizService";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 404, statusMessage: "Quiz not found" });
  }

  const body = await readBody(event);
  const result = getQuizService().update(id, body);

  if (!result.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid quiz",
      data: { errors: result.errors },
    });
  }

  if (!result.value) {
    throw createError({ statusCode: 404, statusMessage: "Quiz not found" });
  }

  return { id: result.value.id };
});
