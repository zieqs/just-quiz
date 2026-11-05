# JustQuiz — Local SQLite Backend Design

**Date:** 2026-11-05
**Status:** Draft for approval
**Author:** Student fork maintainer
**Upstream:** https://github.com/4yami/just-quiz (friend's repo, same assignment group)

## 1. Intent and Why

This is a fork of JustQuiz (an offline-first quiz practice SPA) for a Software Quality and
Configuration Management (SQCM) assignment. The lecturer requires a working project with a
database she can open and inspect, and she will later assign additional functional
requirements and review the Git history.

The upstream app already persists quizzes locally in IndexedDB and treats Google Drive as an
optional backup. That does not give the lecturer a database file to open, and it drags in an
OAuth integration that is irrelevant to the assignment.

**Goal:** replace Google Drive and browser storage as the system of record with a real,
inspectable SQLite database served by the app's own local backend, while keeping the existing
UI and quiz-playing behaviour intact.

## 2. Goals

- A single SQLite database file the lecturer can open with DB Browser for SQLite and inspect
  tables and rows.
- A visible, normalised schema (not JSON blobs) committed as SQL migration files.
- The app keeps its current features: import, create, edit, delete, search, sort, play,
  resume, score review, JSON export.
- The app runs locally with `pnpm dev` for the demo.
- Clean, reviewable Git history with small commits and feature branches.
- Documentation suitable for a code review: requirements, schema, API, setup.

## 3. Non-Goals

- User accounts, authentication, roles, or multi-user access.
- Cloud sync, remote hosting, or GitHub Pages deployment.
- Server-side rendering. The UI stays an SPA (`ssr: false`).
- Offline data access. The app needs its local server running; the PWA shell may still cache
  assets, but quiz data comes from SQLite.
- Migrating existing browser IndexedDB data. The fork starts fresh; a seed script provides
  demo data.
- A second application framework (no separate Express server). Nuxt/Nitro is the backend.

## 4. Anti-Goals

- Do not commit the SQLite file, WAL/journal files, secrets, or generated output.
- Do not rewrite or force-push the upstream author's history.
- Do not remove attribution to the upstream project and author.
- Do not break the existing UX while swapping the data layer.

## 5. Constraints and Decisions

| Area | Decision |
|---|---|
| Runtime | Node.js >= 24 (built-in `node:sqlite` is stable enough and verified on Node 26.10.0) |
| Framework | Existing Nuxt 4.5 + Vue 3 + TypeScript; Nitro server routes |
| DB engine | SQLite via Node's built-in `node:sqlite` (`DatabaseSync`) |
| ORM | None. Explicit SQL and a small repository module. Chosen for transparency in review. |
| DB file | `data/justquiz.db`, overridable with `JUSTQUIZ_DB_PATH` |
| Migrations | Plain `.sql` files in `db/migrations/`, applied idempotently at server start and via script |
| IDs | UUID strings generated on the server if missing; kept stable on update |
| Timestamps | Integer epoch milliseconds (`created_at`, `updated_at`) for compatibility; ISO view for humans |
| UI mode | `ssr: false` stays; Nitro API runs in dev and in the Node server build |
| PWA | Keep install + asset caching; README states data requires the local server |
| Deployment | Remove GitHub Pages workflow; CI runs typecheck/build/tests only |

### Why `node:sqlite` instead of Prisma/better-sqlite3

- No native module build step and no ORM code generation, which keeps setup reliable on the
  student's and lecturer's machines.
- The SQL is visible in the repo, matching the assignment's "database can be accessed" review.
- Verified working on the target machine (`node:sqlite` query round-trip succeeded).

## 6. Database Design

### 6.1 Schema

```sql
PRAGMA foreign_keys = ON;

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

CREATE TABLE schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE INDEX idx_quizzes_created_at   ON quizzes(created_at);
CREATE INDEX idx_questions_quiz_id    ON questions(quiz_id);
CREATE INDEX idx_choices_question_id  ON choices(question_id);
CREATE INDEX idx_answers_question_id  ON accepted_answers(question_id);

-- Human-readable view for DB Browser demonstrations
CREATE VIEW quiz_overview AS
SELECT
  q.id,
  q.title,
  q.description,
  (SELECT COUNT(*) FROM questions qq WHERE qq.quiz_id = q.id) AS question_count,
  datetime(q.created_at / 1000, 'unixepoch') AS created_at_utc,
  datetime(q.updated_at / 1000, 'unixepoch') AS updated_at_utc
FROM quizzes q;
```

### 6.2 Mapping rules

- One `quizzes` row per quiz.
- One `questions` row per question, ordered by `position`.
- `choices` rows only for `single`, `multiple`, `true_false`; `is_correct = 1` for every index
  in `correctIndices`.
- `accepted_answers` rows only for `short_answer`.
- `Quiz.questions[].correctIndices` is reconstructed from `is_correct` rows in `position` order.
- Deleting a quiz cascades to questions, then choices/answers.
- Updating a quiz replaces all child rows inside one transaction; `created_at` is preserved.

**ID policy (builder call):** on `POST`, the server always mints a fresh quiz UUID, so importing
an exported quiz produces a copy. Question UUIDs supplied by the client are kept only when they
are not already present in `questions`; otherwise a fresh UUID is generated. `PUT` keeps the quiz
ID and existing question IDs as supplied by the edit page. This avoids primary-key collisions
when a JSON export is re-imported.

**Duplicate titles:** allowed. Only Drive restore deduplicated by title, and that feature is
removed. Importing the same quiz twice creates two rows, matching the current
`saveImportedQuiz` behaviour.

### 6.3 Seed data

`db/seed.sql` inserts the existing sample quiz (World Capitals, one of each question type) with
fixed IDs. `pnpm db:seed` applies it idempotently (`INSERT OR REPLACE`). This gives the lecturer
something to inspect immediately after setup.

## 7. API Design (Nitro)

All routes are same-origin under `/api`.

| Method | Route | Request | Response |
|---|---|---|---|
| GET | `/api/quizzes` | — | `Quiz[]` (full, newest first) |
| POST | `/api/quizzes` | quiz payload | `201 { id }` |
| GET | `/api/quizzes/:id` | — | `Quiz` or `404` |
| PUT | `/api/quizzes/:id` | quiz payload | `200 { id }` or `404` |
| DELETE | `/api/quizzes/:id` | — | `204` or `404` |
| GET | `/api/quizzes/short/:prefix` | — | `Quiz` or `404` |

Validation:

- The server normalises the payload **before** validating it: default missing `type` to
  `single`; default `true_false` to `["True","False"]` when no choices are supplied; coerce
  scalar `correctIndex`/`acceptedAnswer` to arrays; generate missing IDs.
- After normalisation the server runs the same quiz validator used by the client and returns
  `400 { errors: string[] }` on failure.
- Unknown question types, empty titles/questions, fewer than two choices on choice questions,
  out-of-range correct indices, and missing accepted answers are rejected.
- `PUT` is a **full replacement** of quiz content. The client composable keeps its existing
  `updateQuiz(id, partial)` signature by fetching the current quiz, merging the partial fields,
  and sending the complete quiz; the server rejects payloads that are not a complete valid quiz.
  This preserves the current editor call site while preventing accidental deletion of questions.

Error format is consistent: `{ error: string }` for unexpected failures, `{ errors: string[] }`
for validation.

## 8. Frontend Changes

The data layer is already isolated behind `app/composables/useQuizDb.ts`. Keep its public
functions and return shapes, and change only the internals to `$fetch` calls:

`saveImportedQuiz`, `createQuiz`, `getQuiz`, `getQuizByShortId`, `getAllQuizzes`, `updateQuiz`,
`deleteQuiz`.

- `upsertImportedQuiz` is removed; it existed only for the Drive merge flow.
- `app/utils/db.ts` (Dexie) is deleted.
- `app/composables/useGoogleDrive.ts` is deleted.
- `app/pages/setup.vue` and its `/setup` nav link are deleted.
- Dashboard: remove Save Files / Load Files buttons, feedback state, Drive error handling, and
  `handleSaveAll` / `handleLoadAllFromDrive`.
- `ShareModal.vue`: remove sign-in and "Save File to Drive"; keep download JSON, copy JSON,
  preview.
- `nuxt.config.ts`: remove `runtimeConfig.public.googleDriveClientId`; remove
  `nitro.preset: 'static'` and `nitro.prerender`.
- `.env.example`: replace Google credentials with `JUSTQUIZ_DB_PATH` documentation.
- `.gitignore`: ignore `data/*.db`, `*.db-wal`, `*.db-shm`, `*.db-journal`.
- Search and sort remain client-side over the returned list.

**Editor validation (builder call):** the editor runs the shared validator on save and blocks
submission with per-field messages, instead of the current `alert()`-based title/question-count
check. This keeps the database free of unreachable questions and makes create/edit behave the
same as import. The create/edit pages render `{ errors: string[] }` from the API in the existing
alert box.

**User-facing copy:** the README, `about.vue`, and `format.vue` currently claim "no servers",
"works offline", and "saved on this device". These claims are no longer true for quiz data and
must be rewritten to say quizzes are stored in a local SQLite database on the machine running
the app. This copy work is in scope. The design document itself may keep historical references
to Google Drive.

## 9. Server Structure

```
server/
  plugins/database.ts        # open DB, enable foreign keys, run pending migrations
  utils/db.ts                # singleton DatabaseSync instance + path resolution
  utils/migrations.ts        # read db/migrations/*.sql, apply in order, record versions
  utils/quizRepository.ts    # list/get/getByPrefix/create/update/delete + row<->Quiz mapping
  utils/validateQuiz.ts      # server-side validation entry point
  api/quizzes/index.get.ts
  api/quizzes/index.post.ts
  api/quizzes/[id].get.ts
  api/quizzes/[id].put.ts
  api/quizzes/[id].delete.ts
  api/quizzes/short/[prefix].get.ts
shared/
  quizValidation.ts          # validation shared by app and server
  quizTypes.ts               # Quiz/Question types shared by app and server (if aliases allow)
db/
  migrations/001_init.sql
  seed.sql
scripts/
  db-seed.mjs                # applies db/seed.sql
  db-reset.mjs               # optional: delete + re-migrate + seed
```

Open question left to the builder: whether to move `app/types/quiz.ts` into `shared/` or import
it from server code. Whichever alias path is chosen, `pnpm typecheck` must pass for both app and
server.

## 10. Scripts and Configuration

`package.json`:

```json
{
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "node .output/server/index.mjs",
    "typecheck": "nuxt typecheck",
    "db:migrate": "node scripts/db-migrate.mjs",
    "db:seed": "node scripts/db-seed.mjs",
    "db:reset": "node scripts/db-reset.mjs",
    "test": "vitest run"
  }
}
```

Migrations run automatically when the Nitro server starts, so a fresh clone works with
`pnpm install && pnpm dev`; the explicit scripts exist for demos and CI.

## 11. Documentation and Git Deliverables

- `README.md`: what the fork is, attribution, setup, DB location, how to open in DB Browser,
  API summary, scripts, architecture diagram, limitations.
- `docs/requirements.md`: the functional requirements table agreed in the design conversation
  (FR-01 … FR-56), covering onboarding, format guidance, import, authoring/management, playback,
  resume, export, PWA install, and theming. The builder derives the exact rows from the current
  app behaviour and removes requirements for the deleted Drive feature.
- `docs/database.md`: schema, ER diagram, mapping rules, how to inspect.
- `docs/api.md`: endpoint table and examples.
- `db/migrations/001_init.sql`, `db/seed.sql` committed.
- `LICENSE`/attribution note: keep the upstream link and note that the README's "Private
  project" applies to the original; the fork is coursework.

**Prerequisite (needs the human partner):** create the GitHub fork and provide its URL/owner.
This checkout currently has `origin = git@github.com:4yami/just-quiz.git` and no `upstream`.

Git workflow:

1. Fork on GitHub; `origin` = fork, `upstream` = friend's repo; upstream push disabled.
2. Tag the untouched baseline (`v0.1.0-upstream`).
3. Branches, each merged via its own PR into the fork's `master`:
   - `chore/baseline-docs`
   - `feat/sqlite-database`
   - `feat/quiz-api`
   - `refactor/use-api-data-layer`
   - `refactor/remove-google-drive`
   - `ci/github-actions`
   - `docs/requirements-and-schema`
4. Conventional commit messages; no giant single commit.

## 12. CI

Replace `.github/workflows/deploy.yml` with `.github/workflows/ci.yml`:

- Trigger: push and pull request.
- Node 24 (or 26), pnpm from `packageManager`.
- Steps: install frozen lockfile, `pnpm typecheck`, `pnpm test` (if tests exist), `pnpm build`.
- No GitHub Pages deploy; a SQLite backend cannot be hosted there.

## 13. Tests (quality evidence)

- Vitest unit tests for `shared/quizValidation.ts`: valid quiz, missing title, empty questions,
  bad type, too few choices, out-of-range indices, short-answer without answers.
- Vitest repository tests against an in-memory SQLite database: create → get → update → delete,
  cascade behaviour, short-prefix lookup.
- Manual smoke checklist for the UI: import, create, edit, delete, play each question type,
  resume, score review, export JSON.

## 14. Acceptance Criteria

1. From a clean clone: `pnpm install`, `pnpm db:seed`, `pnpm dev` → app loads at
   `http://localhost:3000` and shows the seeded quiz.
2. `data/justquiz.db` opens in DB Browser and shows `quizzes`, `questions`, `choices`,
   `accepted_answers`, `schema_migrations`, and `quiz_overview` with sensible rows.
3. Import of the sample JSON creates rows in all four tables; an invalid import shows errors and
   writes nothing.
4. Create, edit, delete, search, sort, play, resume, score review, and JSON export all work.
5. No Google Drive references remain in application code, runtime config, or UI. Historical
   mentions in this design document and the Git history are acceptable and expected.
6. `pnpm build && pnpm preview` serves the app and API from the Node server.
7. `pnpm typecheck` and `pnpm test` pass; CI is green.
8. README and `docs/` explain setup, schema, API, and the DB inspection step, and no
   user-facing copy still claims the app needs no server or works fully offline for quiz data.

## 15. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `node:sqlite` API differences on another Node version | Pin `engines.node >= 24`, document it, CI uses the same version |
| SPA still pointing at old Dexie calls | Keep `useQuizDb` signatures; grep for `dexie`/`db.` after refactor |
| PWA service worker serving stale assets during the demo | Test with a fresh profile; bump/disable workbox cache as needed |
| Lecturer's machine is Windows | Use `path.resolve` for the DB path; document `.db` location |
| Data loss from deleting the DB file | Seed/reset scripts documented; export JSON still available |
| Accidental push to friend's repo | `origin` = fork; `upstream` push URL disabled |
| Scope creep from lecturer's later requirements | Schema and repository layer are small and normalised, so new tables/columns are additive |

## 16. What Is Left to the Builder

- Exact Nuxt alias used for shared validation/types (`shared/` vs `app/utils`), provided
  typecheck passes.
- Whether `schema_migrations` is applied by a Nitro plugin, a script, or both (both recommended).
- Precise Nitro transaction helper implementation for updates.
- Whether to add the optional `/database` viewer page. Default: skip; DB Browser is enough.
- Exact wording of README attribution.
- Whether to include Vitest in the first pass or add it in a follow-up branch.

## 17. Calls Made During Review

These were ambiguous in the draft and are now settled as the author's calls:

- Create always mints a new quiz ID; question IDs are reused only when collision-free.
- Normalise before validating, including defaulting `true_false` choices.
- `PUT` is full replacement; the client adapter merges partial updates before sending.
- The editor adopts the full shared validator instead of the current alerts.
- User-facing "offline / no server" copy is rewritten; the design doc may keep history.
- Functional requirements are derived from the current app, minus Drive.
