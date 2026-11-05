import {
  validateQuizJson as sharedValidateQuizJson,
  type ValidationResult,
} from "~~/shared/quiz";

export { type ValidationResult };

export const validateQuizJson = sharedValidateQuizJson;
