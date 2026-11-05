# JustQuiz — Database Design

SQLite database file: `data/justquiz.db` (overridable with `JUSTQUIZ_DB_PATH`).

The schema is normalised so every table can be inspected directly in DB Browser for SQLite. Questions belong to a quiz; choices and accepted answers belong to a question. Foreign keys are enforced and cascade on delete.

```mermaid
erDiagram
    QUIZZES ||--o{ QUESTIONS : "contains"
    QUESTIONS ||--o{ CHOICES : "has options"
    QUESTIONS ||--o{ ACCEPTED_ANSWERS : "accepts"

    QUIZZES {
        TEXT id PK "UUID v4"
        TEXT title "NOT NULL"
        TEXT description "default ''"
        INTEGER created_at "epoch ms"
        INTEGER updated_at "epoch ms"
    }

    QUESTIONS {
        TEXT id PK "UUID v4"
        TEXT quiz_id FK "references quizzes.id"
        TEXT type "single | multiple | true_false | short_answer"
        TEXT text "question wording"
        TEXT explanation "optional feedback"
        INTEGER position "order inside quiz"
    }

    CHOICES {
        INTEGER id PK "autoincrement"
        TEXT question_id FK "references questions.id"
        TEXT text "option wording"
        INTEGER position "order inside question"
        INTEGER is_correct "1 = correct, 0 = wrong"
    }

    ACCEPTED_ANSWERS {
        INTEGER id PK "autoincrement"
        TEXT question_id FK "references questions.id"
        TEXT text "accepted spelling/case"
        INTEGER position "order inside question"
    }

    SCHEMA_MIGRATIONS {
        TEXT version PK "migration filename"
        INTEGER applied_at "epoch ms"
    }
```

## Relationships

| Relationship | Cardinality | Delete behaviour |
|---|---|---|
| `quizzes` → `questions` | one-to-many | `ON DELETE CASCADE` |
| `questions` → `choices` | one-to-many | `ON DELETE CASCADE` |
| `questions` → `accepted_answers` | one-to-many | `ON DELETE CASCADE` |
| `schema_migrations` | standalone | internal bookkeeping only |

## Rules

- `questions.type` is restricted by a `CHECK` constraint to the four supported types.
- Choice-based questions (`single`, `multiple`, `true_false`) use `choices`; `is_correct = 1` marks the answer.
- `short_answer` questions use `accepted_answers` and have no choices.
- `correctIndices` in the app is reconstructed from the ordered `choices` rows where `is_correct = 1`.
- `acceptedAnswers` in the app is reconstructed from the ordered `accepted_answers` rows.
- Deleting a quiz removes its questions, choices, and accepted answers through cascades.
- Updating a quiz replaces its child rows inside one transaction; `created_at` is preserved.

## Indexes

| Index | Column | Purpose |
|---|---|---|
| `idx_quizzes_created_at` | `quizzes.created_at` | newest-first listing |
| `idx_questions_quiz_id` | `questions.quiz_id` | load a quiz's questions |
| `idx_choices_question_id` | `choices.question_id` | load a question's choices |
| `idx_answers_question_id` | `accepted_answers.question_id` | load a question's accepted answers |

## Readable view

`quiz_overview` joins the summary a reviewer usually wants:

```sql
SELECT * FROM quiz_overview;
```

| Column | Meaning |
|---|---|
| `id` | quiz UUID |
| `title` | quiz title |
| `description` | quiz description |
| `question_count` | number of questions |
| `created_at_utc` | readable creation time |
| `updated_at_utc` | readable update time |
