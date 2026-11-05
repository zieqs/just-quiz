-- 001_init.sql — normalised quiz storage for JustQuiz.

CREATE TABLE quizzes (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE questions (
  id          TEXT PRIMARY KEY,
  quiz_id     TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('single','multiple','true_false','short_answer')),
  text        TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL
);

CREATE TABLE choices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  position    INTEGER NOT NULL,
  is_correct  INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0,1))
);

CREATE TABLE accepted_answers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  position    INTEGER NOT NULL
);

CREATE INDEX idx_quizzes_created_at   ON quizzes(created_at);
CREATE INDEX idx_questions_quiz_id    ON questions(quiz_id);
CREATE INDEX idx_choices_question_id  ON choices(question_id);
CREATE INDEX idx_answers_question_id  ON accepted_answers(question_id);

-- Human-readable view for DB Browser demonstrations.
CREATE VIEW quiz_overview AS
SELECT
  q.id,
  q.title,
  q.description,
  (SELECT COUNT(*) FROM questions qq WHERE qq.quiz_id = q.id) AS question_count,
  datetime(q.created_at / 1000, 'unixepoch') AS created_at_utc,
  datetime(q.updated_at / 1000, 'unixepoch') AS updated_at_utc
FROM quizzes q;
