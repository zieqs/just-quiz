import { getQuizService } from "../../utils/quizService";

export default defineEventHandler(() => getQuizService().list());
