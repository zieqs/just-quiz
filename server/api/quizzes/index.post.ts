import { getQuizService } from "../../utils/quizService";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = getQuizService().create(body);

  if (!result.ok) {
    setResponseStatus(event, 400);
    return { errors: result.errors };
  }

  setResponseStatus(event, 201);
  return { id: result.value.id };
});
