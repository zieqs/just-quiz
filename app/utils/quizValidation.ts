// app/utils/quizValidation.ts

export interface ValidationResult {
  valid: boolean;
  errors: string[]; // human-readable messages, shown one-by-one in the modal
}

const VALID_TYPES = ['single', 'multiple', 'true_false', 'short_answer'];

export const validateQuizJson = (data: any): ValidationResult => {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['JSON must be an object.'] };
  }

  if (typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Quiz must have a non-empty "title" string.');
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push('Quiz must contain a "questions" array with at least one question.');
    return { valid: false, errors }; // stop here — nothing else to validate
  }

  data.questions.forEach((q: any, i: number) => {
    const label = `Question ${i + 1}`;

    if (!q || typeof q !== 'object') {
      errors.push(`${label}: must be an object.`);
      return;
    }

    if (!q.text || typeof q.text !== 'string') {
      errors.push(`${label}: missing "text".`);
      return;
    }

    const type = q.type || 'single'; // defaults to single (matches formatQuestion)
    if (!VALID_TYPES.includes(type)) {
      errors.push(`${label}: unknown type "${type}".`);
      return;
    }

    if (type === 'short_answer') {
      const accepted = q.acceptedAnswers ?? (q.acceptedAnswer ? [q.acceptedAnswer] : []);
      if (!Array.isArray(accepted) || accepted.length === 0) {
        errors.push(`${label}: short_answer needs "acceptedAnswers".`);
      }
    } else if (type === 'true_false') {
      const choices = (Array.isArray(q.choices) && q.choices.length >= 2) ? q.choices : ['True', 'False'];
      const correct = q.correctIndices ?? (typeof q.correctIndex === 'number' ? [q.correctIndex] : []);
      if (!Array.isArray(correct) || correct.length === 0) {
        errors.push(`${label}: missing correct answer (correctIndices).`);
      } else if (correct.some((c: number) => c < 0 || c >= choices.length)) {
        errors.push(`${label}: correctIndices out of range.`);
      }
    } else {
      const choices = q.choices;
      if (!Array.isArray(choices) || choices.length < 2) {
        errors.push(`${label}: needs at least 2 "choices".`);
        return;
      }

      const correct = q.correctIndices ?? (typeof q.correctIndex === 'number' ? [q.correctIndex] : []);
      if (!Array.isArray(correct) || correct.length === 0) {
        errors.push(`${label}: missing correct answer (correctIndices).`);
      } else if (correct.some((c: number) => c < 0 || c >= choices.length)) {
        errors.push(`${label}: correctIndices out of range.`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
};
