-- Seed data for demos. Safe to run repeatedly.

DELETE FROM quizzes WHERE id = 'seed-world-capitals';

INSERT INTO quizzes (id, title, description, created_at, updated_at)
VALUES (
  'seed-world-capitals',
  'World Capitals Quiz',
  'Test your geography knowledge!',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

INSERT INTO questions (id, quiz_id, type, text, explanation, position)
VALUES
  ('seed-q1', 'seed-world-capitals', 'single', 'What is the capital of France?', 'Paris is the capital of France.', 0),
  ('seed-q2', 'seed-world-capitals', 'multiple', 'Which of the following are European countries?', 'France and Germany are in Europe. Brazil is in South America, Japan is in Asia.', 1),
  ('seed-q3', 'seed-world-capitals', 'true_false', 'The capital of Japan is Tokyo.', 'Tokyo is indeed the capital of Japan.', 2),
  ('seed-q4', 'seed-world-capitals', 'short_answer', 'What is the capital of Australia?', 'Canberra is the capital of Australia, not Sydney.', 3);

INSERT INTO choices (question_id, text, position, is_correct)
VALUES
  ('seed-q1', 'Paris', 0, 1),
  ('seed-q1', 'London', 1, 0),
  ('seed-q1', 'Berlin', 2, 0),
  ('seed-q1', 'Madrid', 3, 0),
  ('seed-q2', 'France', 0, 1),
  ('seed-q2', 'Brazil', 1, 0),
  ('seed-q2', 'Japan', 2, 0),
  ('seed-q2', 'Germany', 3, 1),
  ('seed-q3', 'True', 0, 1),
  ('seed-q3', 'False', 1, 0);

INSERT INTO accepted_answers (question_id, text, position)
VALUES
  ('seed-q4', 'Canberra', 0),
  ('seed-q4', 'canberra', 1);
