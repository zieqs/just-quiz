# Local SQLite Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace JustQuiz's IndexedDB + Google Drive data layer with a local SQLite database served by Nuxt/Nitro, keeping the existing UI and quiz behaviour.

**Architecture:** Nitro API routes call a small SQLite repository built on Node's `node:sqlite`. A normalised schema (`quizzes` → `questions` → `choices` / `accepted_answers`) lives in plain SQL migrations applied at server start. The Vue app keeps its `useQuizDb()` interface and swaps its internals for `$fetch` calls. Google Drive is removed entirely.

**Tech Stack:** Nuxt 4.5, Vue 3, TypeScript, Nitro, `node:sqlite` (Node >=24), Tailwind, Vite PWA, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-05-sqlite-local-backend-design.md`

## Global Constraints

- Node.js `>=24`; pnpm `11.20.0`; no ORM and no native SQLite package. Use only built-in `node:sqlite` (`DatabaseSync`).
- Database file: `data/justquiz.db`, overridable with `JUSTQUIZ_DB_PATH`; never commit `*.db`, `*.db-wal`, `*.db-shm`, `*.db-journal`.
- Keep `ssr: false`; the UI stays a Vue SPA. API routes run in Nitro dev and the Node server build.
- Keep the public functions and return shapes of `app/composables/useQuizDb.ts`.
- All timestamps are integer epoch milliseconds. IDs are UUID strings.
- Remove all Google Drive code, config, UI, and user-facing claims of "no server" / "fully offline" for quiz data. Historical mentions in `docs/superpowers/specs/` are allowed.
- Conventional commits. One PR-sized branch per task group; never push to `upstream`.
- Tests run with `pnpm test` (Vitest, Node environment).

## Review Focus

1. Re-importing an exported quiz must create a copy without primary-key collisions on `quizzes.id` or `questions.id`.
2. A `true_false` question with no explicit choices must normalise to `["True","False"]` and import successfully.
3. A partial edit payload must not wipe questions; the client adapter merges before `PUT`.
4. Deleting a quiz must leave no orphaned `questions`, `choices`, or `accepted_answers` rows.
5. `/quiz/<slug>-<shortId>` must resolve the quiz whose UUID starts with that 8-character prefix, without picking a different quiz.

---

### Task 1: Fork, remotes, baseline tag, and design docs

**Files:**
- Commit: `docs/superpowers/specs/2026-11-05-sqlite-local-backend-design.md`
- Commit: `docs/superpowers/plans/2026-11-05-sqlite-local-backend.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `origin` = your fork, `upstream` = friend's repo with pushes disabled, tag `v0.1.0-upstream` on the untouched upstream commit.

- [ ] **Step 1: Create the GitHub fork**

On github.com, fork `4yami/just-quiz` into your account. Confirm the fork URL, e.g. `git@github.com:<your-username>/just-quiz.git`.

- [ ] **Step 2: Re-point remotes and disable upstream pushes**

```bash
git remote rename origin upstream
git remote add origin git@github.com:<your-username>/just-quiz.git
git remote set-url --push upstream no_push
git fetch origin
git push -u origin master
```

- [ ] **Step 3: Verify the remotes**

Run: `git remote -v && git push --dry-run upstream master`
Expected: `origin` is your fork; `upstream` has `no_push` as push URL; the dry-run push fails immediately.

- [ ] **Step 4: Tag the untouched baseline**

```bash
git tag -a v0.1.0-upstream -m "Untouched upstream baseline"
git push origin v0.1.0-upstream
```

- [ ] **Step 5: Commit the design and plan on a docs branch**

```bash
git checkout -b docs/design
git add docs/superpowers
git commit -m "docs: add SQLite backend design and implementation plan"
git push -u origin docs/design
```

Open a PR from `docs/design` into your fork's `master`, merge it, then:

```bash
git checkout master && git pull
```

---

### Task 2: Tooling, scripts, and ignore rules

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `.gitignore`
- Modify: `.env.example`

**Interfaces:**
- Consumes: nothing.
- Produces: `pnpm typecheck`, `pnpm test`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:reset`, `pnpm preview`; Vitest alias `~~` → repo root.

- [ ] **Step 1: Add Vitest and the scripts**

Run: `pnpm add -D vitest`

Edit `package.json` so the relevant fields are:

```json
"engines": { "node": ">=24" },
"scripts": {
  "build": "nuxt build",
  "dev": "nuxt dev",
  "preview": "node .output/server/index.mjs",
  "typecheck": "nuxt typecheck",
  "test": "vitest run",
  "db:migrate": "node scripts/db-migrate.mjs",
  "db:seed": "node scripts/db-seed.mjs",
  "db:reset": "node scripts/db-reset.mjs",
  "icons": "node scripts/generate-pwa-icons.mjs",
  "postinstall": "nuxt prepare"
}
```

Remove the `generate` script; the app no longer builds as a static site.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "~~": fileURLToPath(new URL("./", import.meta.url)),
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

- [ ] **Step 3: Ignore database files**

Append to `.gitignore`:

```gitignore
# Local SQLite database
data/*.db
data/*.db-wal
data/*.db-shm
data/*.db-journal
```

- [ ] **Step 4: Replace `.env.example`**

```bash
# Optional: path to the local SQLite database (default: ./data/justquiz.db)
JUSTQUIZ_DB_PATH=./data/justquiz.db
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts .gitignore .env.example
git commit -m "chore: add vitest, node server scripts, and database ignores"
```

---

### Task 3: Shared domain types, normalisation, and validation

**Files:**
- Create: `shared/id.ts`
- Create: `shared/quiz.ts`
- Modify: `app/types/quiz.ts` (re-export only)
- Modify: `app/utils/id.ts` (re-export only)
- Modify: `app/utils/quizValidation.ts` (temporary re-export shim)
- Modify: `app/components/ImportModal.vue` (explicit shared import)
- Test: `tests/shared/quiz.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `generateId(): string`
  - `QuestionType`, `Question`, `Quiz`, `QuizInput`, `ValidationResult`
  - `normalizeQuiz(raw: unknown): QuizInput`
  - `validateQuizJson(data: unknown): ValidationResult`

- [ ] **Step 1: Write the failing tests**

Create `tests/shared/quiz.test.ts` with at least these cases:

```ts
import { describe, expect, it } from "vitest";
import { normalizeQuiz, validateQuizJson } from "~~/shared/quiz";

const valid = {
  title: "Capitals",
  questions: [
    { type: "single", text: "Q1", choices: ["A", "B"], correctIndices: [0] },
    { type: "short_answer", text: "Q2", acceptedAnswers: ["Paris"] },
  ],
};

describe("normalizeQuiz", () => {
  it("defaults true_false choices to True/False", () => {
    const quiz = normalizeQuiz({ title: "T", questions: [{ type: "true_false", text: "Q", correctIndices: [0] }] });
    expect(quiz.questions[0]!.choices).toEqual(["True", "False"]);
    expect(validateQuizJson(quiz).valid).toBe(true);
  });

  it("coerces scalar correctIndex and acceptedAnswer to arrays", () => {
    const quiz = normalizeQuiz({
      title: "T",
      questions: [
        { type: "single", text: "Q", choices: ["A", "B"], correctIndex: 1 },
        { type: "short_answer", text: "S", acceptedAnswer: "x" },
      ],
    });
    expect(quiz.questions[0]!.correctIndices).toEqual([1]);
    expect(quiz.questions[1]!.acceptedAnswers).toEqual(["x"]);
  });

  it("generates ids when missing", () => {
    const quiz = normalizeQuiz(valid);
    expect(quiz.questions.every((q) => typeof q.id === "string" && q.id.length > 0)).toBe(true);
  });
});

describe("validateQuizJson", () => {
  it("accepts a valid quiz", () => expect(validateQuizJson(normalizeQuiz(valid)).valid).toBe(true));
  it("rejects a missing title", () =>
    expect(validateQuizJson(normalizeQuiz({ questions: valid.questions })).errors.join()).toMatch(/title/i));
  it("rejects empty questions", () =>
    expect(validateQuizJson(normalizeQuiz({ title: "T", questions: [] })).valid).toBe(false));
  it("rejects an unknown type", () =>
    expect(validateQuizJson(normalizeQuiz({ title: "T", questions: [{ type: "essay", text: "Q" }] })).errors.join()).toMatch(/unknown type/i));
  it("rejects fewer than two choices", () =>
    expect(validateQuizJson(normalizeQuiz({ title: "T", questions: [{ type: "single", text: "Q", choices: ["A"], correctIndices: [0] }] })).valid).toBe(false));
  it("rejects out-of-range correct indices", () =>
    expect(validateQuizJson(normalizeQuiz({ title: "T", questions: [{ type: "single", text: "Q", choices: ["A", "B"], correctIndices: [5] }] })).valid).toBe(false));
  it("rejects blank choice text", () =>
    expect(validateQuizJson(normalizeQuiz({ title: "T", questions: [{ type: "single", text: "Q", choices: ["A", "  "], correctIndices: [0] }] })).errors.join()).toMatch(/choice/i));
  it("rejects short_answer without accepted answers", () =>
    expect(validateQuizJson(normalizeQuiz({ title: "T", questions: [{ type: "short_answer", text: "Q" }] })).valid).toBe(false));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/shared/quiz.test.ts`
Expected: FAIL — cannot resolve `~~/shared/quiz`.

- [ ] **Step 3: Implement `shared/id.ts`**

Move the existing UUID logic from `app/utils/id.ts` into `shared/id.ts`, exporting `generateId(): string` unchanged.

- [ ] **Step 4: Implement `shared/quiz.ts`**

Define the interfaces from the spec and implement:

```ts
export type QuestionType = "single" | "multiple" | "true_false" | "short_answer";
export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  explanation?: string;
  choices?: string[];
  correctIndices?: number[];
  acceptedAnswers?: string[];
}
export interface Quiz {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  questions: Question[];
}
export interface QuizInput {
  title: string;
  description: string;
  questions: Question[];
}
export interface ValidationResult { valid: boolean; errors: string[]; }

export const normalizeQuiz = (raw: unknown): QuizInput => { /* per rules below */ };
export const validateQuizJson = (data: unknown): ValidationResult => { /* port current rules */ };
```

Normalisation rules:
- `title`: trimmed string or `""`; `description`: string or `""`.
- `questions`: only array items that are objects; each gets `id` (existing string or `generateId()`), `text` (string or `""`), `explanation` (string or `""`).
- `type`: keep a string as supplied; default `"single"` when missing.
- `choices`: clone arrays; for `true_false` with no array use `["True","False"]`; otherwise `[]`.
- `correctIndices`: clone number arrays; a single number becomes `[n]`; otherwise `[]`.
- `acceptedAnswers`: clone string arrays; a single string becomes `[s]`; otherwise `[]`.

Validation ports the current `app/utils/quizValidation.ts` rules, including the `/unknown type/i`, `/title/i`, choice-count, range, and accepted-answer messages. Add two rules: every choice must be a non-empty string after trimming (error message must contain "choice"), and every accepted answer must be non-empty after trimming.

- [ ] **Step 5: Re-export from the old locations**

`app/types/quiz.ts`:

```ts
export type { QuestionType, Question, Quiz, QuizInput } from "~~/shared/quiz";
```

`app/utils/id.ts`:

```ts
import { generateId as sharedGenerateId } from "~~/shared/id";
export const generateId = sharedGenerateId;
```

`app/utils/quizValidation.ts` (temporary until Task 10):

```ts
import { validateQuizJson as sharedValidate } from "~~/shared/quiz";
export const validateQuizJson = sharedValidate;
```

- [ ] **Step 6: Update `ImportModal.vue`**

Add `import { validateQuizJson } from "~~/shared/quiz";` and keep the existing parse → validate → save flow.

- [ ] **Step 7: Run tests and typecheck**

Run: `pnpm exec vitest run tests/shared/quiz.test.ts && pnpm typecheck`
Expected: all shared tests PASS; no type errors.

- [ ] **Step 8: Commit**

```bash
git add shared app/types/quiz.ts app/utils/id.ts app/utils/quizValidation.ts app/components/ImportModal.vue tests/shared/quiz.test.ts
git commit -m "feat: share quiz validation and normalisation between app and server"
```

---

### Task 4: Database bootstrap and migrations

**Files:**
- Create: `db/migrations/001_init.sql`
- Create: `server/utils/db.ts`
- Create: `server/utils/migrations.ts`
- Create: `server/plugins/database.ts`
- Create: `scripts/db-migrate.mjs`
- Test: `tests/db/migrations.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `openDatabase(path?: string): DatabaseSync`
  - `getDbPath(): string`
  - `getDb(): DatabaseSync` (singleton; auto-migrates)
  - `runMigrations(db: DatabaseSync, dir?: string): void`

- [ ] **Step 1: Write the failing test**

`tests/db/migrations.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "~~/server/utils/db";
import { runMigrations } from "~~/server/utils/migrations";

let db: ReturnType<typeof openDatabase> | null = null;
afterEach(() => db?.close());

describe("runMigrations", () => {
  it("creates the domain tables, indexes, and view", () => {
    db = openDatabase(":memory:");
    runMigrations(db);
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view')").all().map((r: any) => r.name);
    expect(names).toEqual(expect.arrayContaining(["quizzes", "questions", "choices", "accepted_answers", "schema_migrations", "quiz_overview"]));
  });

  it("is idempotent", () => {
    db = openDatabase(":memory:");
    runMigrations(db);
    runMigrations(db);
    expect(db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get()).toEqual({ n: 1 });
  });

  it("enables foreign keys", () => {
    db = openDatabase(":memory:");
    expect(db.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/db/migrations.test.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Write `db/migrations/001_init.sql`**

Copy the schema from the spec (`quizzes`, `questions`, `choices`, `accepted_answers`, indexes, and the `quiz_overview` view). Do not create `schema_migrations` here; the runner owns it.

- [ ] **Step 4: Implement `server/utils/db.ts`**

```ts
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runMigrations } from "./migrations";

export const getDbPath = (): string =>
  resolve(process.cwd(), process.env.JUSTQUIZ_DB_PATH || "data/justquiz.db");

export const openDatabase = (path = getDbPath()): DatabaseSync => {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
  return db;
};

let instance: DatabaseSync | null = null;
export const getDb = (): DatabaseSync => {
  if (!instance) {
    instance = openDatabase();
    runMigrations(instance);
  }
  return instance;
};
```

Use relative imports (`./migrations`) so Vitest resolves without Nitro.

- [ ] **Step 5: Implement `server/utils/migrations.ts`**

```ts
import type { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const runMigrations = (
  db: DatabaseSync,
  dir = resolve(process.cwd(), "db/migrations")
): void => { /* create schema_migrations, list *.sql sorted, apply pending in a transaction */ };
```

Each migration runs inside `BEGIN`/`COMMIT`, inserts its filename into `schema_migrations(version, applied_at)`, and rolls back on error.

- [ ] **Step 6: Add the Nitro startup plugin**

`server/plugins/database.ts`:

```ts
export default defineNitroPlugin(() => {
  getDb();
});
```

- [ ] **Step 7: Add `scripts/db-migrate.mjs`**

Plain ESM script using `node:sqlite`; opens `JUSTQUIZ_DB_PATH || ./data/justquiz.db`, creates `schema_migrations`, applies `db/migrations/*.sql` in order, prints each applied version. Duplicate the small runner rather than importing TypeScript from a script.

- [ ] **Step 8: Run test and the migrate script**

Run: `pnpm exec vitest run tests/db/migrations.test.ts && pnpm db:migrate`
Expected: tests PASS; script reports `applied 001_init.sql`; `data/justquiz.db` exists.

- [ ] **Step 9: Commit**

```bash
git add db/migrations/001_init.sql server/utils/db.ts server/utils/migrations.ts server/plugins/database.ts scripts/db-migrate.mjs tests/db/migrations.test.ts
git commit -m "feat: add SQLite bootstrap and SQL migrations"
```

---

### Task 5: Quiz repository

**Files:**
- Create: `server/utils/quizRepository.ts`
- Test: `tests/db/quizRepository.test.ts`

**Interfaces:**
- Consumes: `openDatabase`, `runMigrations`; `Quiz`, `QuizInput` from `~~/shared/quiz`; `generateId` from `~~/shared/id`.
- Produces:

```ts
export interface QuizRepository {
  list(): Quiz[];
  get(id: string): Quiz | null;
  getByShortPrefix(prefix: string): Quiz | null;
  create(input: QuizInput): Quiz;
  update(id: string, input: QuizInput): Quiz | null;
  remove(id: string): boolean;
}
export const createQuizRepository = (db: DatabaseSync): QuizRepository;
```

- [ ] **Step 1: Write the failing tests**

`tests/db/quizRepository.test.ts` — create a fresh in-memory DB per test and migrate it:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "~~/server/utils/db";
import { runMigrations } from "~~/server/utils/migrations";
import { createQuizRepository } from "~~/server/utils/quizRepository";
import type { QuizInput } from "~~/shared/quiz";

const input = (): QuizInput => ({
  title: "Capitals",
  description: "d",
  questions: [
    { id: "q-single", type: "single", text: "Q1", choices: ["A", "B"], correctIndices: [1] },
    { id: "q-multi", type: "multiple", text: "Q2", choices: ["A", "B", "C"], correctIndices: [0, 2] },
    { id: "q-tf", type: "true_false", text: "Q3", choices: ["True", "False"], correctIndices: [0] },
    { id: "q-short", type: "short_answer", text: "Q4", acceptedAnswers: ["Paris", "paris"] },
  ],
});
```

Tests and assertions:
- `create` then `get`: title, description, 4 questions in order, `correctIndices` `[1]`, `[0,2]`, `[0]`, and `acceptedAnswers` `["Paris","paris"]`; `createdAt` and `updatedAt` are numbers.
- `create` twice with the same input question IDs: both quizzes exist; the second quiz's question IDs differ from the first (collision policy).
- `list` returns newest first.
- `update` with a new full input: 2 questions only; old children gone; `createdAt` unchanged and `updatedAt >= createdAt`.
- `remove` then `get` → `null`; direct `SELECT COUNT(*)` on `questions`, `choices`, `accepted_answers` returns 0.
- `getByShortPrefix`: insert a quiz, call with the first 8 chars of its ID → returns it; call with `"nonexistent"` → `null`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/db/quizRepository.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `server/utils/quizRepository.ts`**

- `create`: transaction; new quiz UUID via `generateId()`; insert quiz with server timestamps; for each question reuse a supplied ID only if it does not already exist in `questions`, otherwise `generateId()`; insert `choices` with `is_correct = correctIndices.includes(index) ? 1 : 0`; insert `accepted_answers`. Return `get(id)!`.
- `update`: return `null` when the quiz is missing; transaction; update title/description/`updated_at`; delete then reinsert all questions/choices/answers; preserve `created_at`; return `get(id)`.
- `remove`: run `DELETE FROM quizzes WHERE id = ?`; return `changes > 0`.
- `list`: `SELECT ... FROM quizzes ORDER BY created_at DESC`, map each via `get` (dataset is small).
- `getByShortPrefix`: `WHERE id LIKE ? ORDER BY created_at DESC LIMIT 2`, using `prefix + "%"`; return the first match.
- Add a `tx<T>(fn)` helper using `BEGIN`/`COMMIT`/`ROLLBACK`.
- Map rows to `Quiz`/`Question`: choices ordered by `position`, `correctIndices` from `is_correct = 1`, accepted answers ordered by `position`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/db/quizRepository.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/quizRepository.ts tests/db/quizRepository.test.ts
git commit -m "feat: add SQLite quiz repository with cascade and prefix lookup"
```

---

### Task 6: Quiz service and HTTP API

**Files:**
- Create: `server/utils/quizService.ts`
- Create: `server/api/quizzes/index.get.ts`
- Create: `server/api/quizzes/index.post.ts`
- Create: `server/api/quizzes/[id].get.ts`
- Create: `server/api/quizzes/[id].put.ts`
- Create: `server/api/quizzes/[id].delete.ts`
- Create: `server/api/quizzes/short/[prefix].get.ts`
- Test: `tests/server/quizService.test.ts`

**Interfaces:**
- Consumes: `createQuizRepository`, `getDb`, `normalizeQuiz`, `validateQuizJson`.
- Produces:

```ts
export type ServiceResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };
export interface QuizService {
  list(): Quiz[];
  get(id: string): Quiz | null;
  getByShortPrefix(prefix: string): Quiz | null;
  create(raw: unknown): ServiceResult<Quiz>;
  update(id: string, raw: unknown): ServiceResult<Quiz | null>;
  remove(id: string): boolean;
}
export const createQuizService = (repo: QuizRepository): QuizService;
export const getQuizService = (): QuizService;
```

- [ ] **Step 1: Write the failing service tests**

`tests/server/quizService.test.ts`:
- `create` with valid raw input returns `{ ok: true }` and a persisted quiz.
- `create` with an empty title returns `{ ok: false }` with an errors array; the repository stays empty.
- `update` with a valid full input replaces content; with an invalid input returns errors and leaves the original quiz unchanged.
- `remove` returns `true` once and `false` the second time.
- `getByShortPrefix` resolves the first 8 characters of a created quiz's ID.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/server/quizService.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `server/utils/quizService.ts`**

`create` and `update` run `normalizeQuiz(raw)` then `validateQuizJson(normalized)`; on failure return `{ ok: false, errors }`; on success call the repository with the normalised input. `update` returns `{ ok: true, value: repo.update(id, normalized) }` (the value may be `null` when the ID is unknown).

`getQuizService()` lazily builds `createQuizService(createQuizRepository(getDb()))`.

- [ ] **Step 4: Implement the routes**

Use explicit relative imports (`../../utils/quizService`, `../../../utils/quizService` for the `short/*` route). Each handler:

- `GET /api/quizzes` → `getQuizService().list()`
- `POST /api/quizzes` → `readBody`, `create`; on failure `throw createError({ statusCode: 400, statusMessage: "Invalid quiz", data: { errors } })`; on success `{ id }` with status 201 (`setResponseStatus(event, 201)`).
- `GET /api/quizzes/:id` → `get`; `404` when null.
- `PUT /api/quizzes/:id` → `readBody`, `update`; errors → 400; missing → 404; success `{ id }`.
- `DELETE /api/quizzes/:id` → `remove`; `204` or `404`.
- `GET /api/quizzes/short/:prefix` → `getByShortPrefix`; `404` when null.

- [ ] **Step 5: Run service tests**

Run: `pnpm exec vitest run tests/server/quizService.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify over HTTP**

```bash
pnpm dev
curl -s localhost:3000/api/quizzes
curl -s -X POST localhost:3000/api/quizzes -H 'content-type: application/json' \
  -d '{"title":"Smoke","questions":[{"type":"single","text":"Q","choices":["A","B"],"correctIndices":[0]}]}'
curl -s localhost:3000/api/quizzes/<returned-id>
curl -s -X DELETE -o /dev/null -w '%{http_code}\n' localhost:3000/api/quizzes/<returned-id>
```

Expected: `[]` initially; created `{ "id": "..." }`; full quiz; `204`.

- [ ] **Step 7: Commit**

```bash
git add server/utils/quizService.ts server/api tests/server/quizService.test.ts
git commit -m "feat: expose quiz CRUD API with server-side validation"
```

---

### Task 7: Seed and reset scripts

**Files:**
- Create: `db/seed.sql`
- Create: `scripts/db-seed.mjs`
- Create: `scripts/db-reset.mjs`

**Interfaces:**
- Consumes: `db/migrations/001_init.sql`.
- Produces: `pnpm db:seed` idempotently inserts the sample quiz `seed-world-capitals`; `pnpm db:reset` deletes the DB, re-migrates, and seeds.

- [ ] **Step 1: Write `db/seed.sql`**

Delete the seed quiz first (cascade removes children), then insert:
- `quizzes` row `seed-world-capitals`, title `"World Capitals Quiz"`, description from `app/utils/sampleQuiz.ts`, timestamps `strftime('%s','now')*1000`.
- Four `questions` rows with IDs `seed-q1`…`seed-q4`, positions 0–3, covering single, multiple, true_false, and short_answer.
- Choice rows without explicit integer IDs; `is_correct = 1` for the sample's correct indices.
- Two accepted answers for `seed-q4` (`Canberra`, `canberra`).

- [ ] **Step 2: Write `scripts/db-seed.mjs`**

Open the DB with `node:sqlite`, ensure migrations have run (reuse the same runner approach as `db-migrate.mjs`), then `BEGIN`, `db.exec(readFileSync("db/seed.sql","utf8"))`, `COMMIT`. Print `seeded`. The script must be safe to run repeatedly.

- [ ] **Step 3: Write `scripts/db-reset.mjs`**

Compute the DB path (`JUSTQUIZ_DB_PATH` or `./data/justquiz.db`); delete the file and its `-wal`/`-shm` siblings if present; then run the migrate and seed logic. Print `reset complete`.

- [ ] **Step 4: Verify**

```bash
pnpm db:reset
sqlite3 data/justquiz.db "select count(*) from quizzes; select count(*) from questions; select count(*) from choices; select count(*) from accepted_answers;"
sqlite3 data/justquiz.db "select * from quiz_overview;"
```

Expected: `1`, `4`, `10`, `2`; one overview row with `question_count = 4` and readable UTC dates.

- [ ] **Step 5: Commit**

```bash
git add db/seed.sql scripts/db-seed.mjs scripts/db-reset.mjs
git commit -m "feat: add idempotent seed and reset scripts"
```

---

### Task 8: Frontend API adapter and `useQuizDb` swap

**Files:**
- Create: `app/utils/quizApi.ts`
- Modify: `app/composables/useQuizDb.ts`
- Test: `tests/app/quizApi.test.ts`

**Interfaces:**
- Consumes: `Quiz`, `QuizInput` from `~~/shared/quiz`.
- Produces:

```ts
export type QuizFetcher = <T = any>(
  url: string,
  options?: { method?: string; body?: unknown }
) => Promise<T>;

export interface QuizApi {
  list(): Promise<Quiz[]>;
  get(id: string): Promise<Quiz>;
  getByShortId(shortId: string): Promise<Quiz>;
  create(input: QuizInput): Promise<{ id: string }>;
  update(id: string, input: QuizInput): Promise<{ id: string }>;
  updatePartial(id: string, partial: Partial<Quiz>): Promise<{ id: string }>;
  remove(id: string): Promise<void>;
}

export const createQuizApi = (fetcher: QuizFetcher, base?: string): QuizApi;
```

- [ ] **Step 1: Write the failing tests**

`tests/app/quizApi.test.ts` with a fake fetcher that records calls and returns canned data:

- `list` → `GET /api/quizzes`.
- `get` → `GET /api/quizzes/<id>` with URL-encoded IDs.
- `create` → `POST /api/quizzes` with the input as `body`.
- `updatePartial("id", { title: "New" })` → first `GET /api/quizzes/id`, then `PUT /api/quizzes/id` whose body contains the existing questions and the new title (merge proof).
- `remove` → `DELETE`.
- A fetcher rejection shaped like `{ data: { errors: ["bad"] } }` becomes `Error("bad")`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/app/quizApi.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `app/utils/quizApi.ts`**

Straight `fetcher` calls with `encodeURIComponent`. `updatePartial` performs `get`, then merges `{ title, description, questions }` with the partial, then `update`. Add a private `asQuizError(err)` that turns `err.data.errors` (string array) into `new Error(errors.join("\n"))` and returns other errors unchanged; wrap every call with it.

- [ ] **Step 4: Rewrite `app/composables/useQuizDb.ts`**

Keep the exported function names and shapes:

```ts
export const useQuizDb = () => {
  const api = createQuizApi($fetch as unknown as QuizFetcher);
  return {
    saveImportedQuiz: (raw: QuizInput) => api.create(raw).then((r) => r.id),
    createQuiz: (raw: QuizInput) => api.create(raw).then((r) => r.id),
    getQuiz: (id: string) => api.get(id),
    getQuizByShortId: async (shortId: string) => {
      try { return await api.getByShortId(shortId); }
      catch (err: any) { if (err?.statusCode === 404 || err?.status === 404) return null; throw err; }
    },
    getAllQuizzes: () => api.list(),
    updateQuiz: (id: string, fields: Partial<Quiz>) => api.updatePartial(id, fields),
    deleteQuiz: (id: string) => api.remove(id),
  };
};
```

Remove `formatQuestion` and `upsertImportedQuiz`. `app/utils/db.ts` is still present until Task 10 but is no longer imported.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm exec vitest run tests/app/quizApi.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Manual smoke test**

`pnpm dev`, then: dashboard lists the seeded quiz, create a quiz in the editor, play it, edit it, delete it, and import the sample JSON. All four question types must render and score correctly.

- [ ] **Step 7: Commit**

```bash
git add app/utils/quizApi.ts app/composables/useQuizDb.ts tests/app/quizApi.test.ts
git commit -m "refactor: move quiz data layer from Dexie to the local API"
```

---

### Task 9: Editor validation and error display

**Files:**
- Modify: `app/components/QuizEditor.vue`
- Modify: `app/pages/quiz/new.vue`
- Modify: `app/pages/quiz/edit/[slug].vue`

**Interfaces:**
- Consumes: `normalizeQuiz`, `validateQuizJson` from `~~/shared/quiz`.
- Produces: editor emits only normalised, valid `QuizInput`; invalid saves render a list instead of `alert()`.

- [ ] **Step 1: Update `QuizEditor.vue`**

- Import `normalizeQuiz` and `validateQuizJson`.
- Add `const validationErrors = ref<string[]>([])`.
- In `handleSave()` replace the entire `alert()`-based validation block (title, question count, and per-question checks) with:

```ts
const normalized = normalizeQuiz({
  title: quizTitle.value,
  description: quizDescription.value,
  questions: questions.value,
});
const result = validateQuizJson(normalized);
validationErrors.value = result.errors;
if (!result.valid) return;
emit("save", normalized);
```

- Render `validationErrors` above the footer as a red `<ul>` (mirror the ImportModal error box). Clear the list on any successful save attempt.

- [ ] **Step 2: Show multi-line server errors**

In `new.vue` and `edit/[slug].vue`, add `whitespace-pre-line` to the existing `errorMessage` paragraph so joined validation errors display one per line.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm dev`
Manual: save with no title → error list shown, nothing saved; save with a question that has no correct answer → error list; fix it → saved; edit an existing quiz → questions preserved.

- [ ] **Step 4: Commit**

```bash
git add app/components/QuizEditor.vue app/pages/quiz/new.vue "app/pages/quiz/edit/[slug].vue"
git commit -m "fix: validate editor submissions with the shared quiz rules"
```

---

### Task 10: Remove Google Drive and correct user-facing copy

**Files:**
- Delete: `app/composables/useGoogleDrive.ts`
- Delete: `app/pages/setup.vue`
- Delete: `app/utils/db.ts`
- Delete: `app/utils/quizValidation.ts`
- Modify: `app/pages/index.vue`
- Modify: `app/components/ShareModal.vue`
- Modify: `app/components/AppHeader.vue`
- Modify: `nuxt.config.ts`
- Modify: `app/pages/about.vue`
- Modify: `app/pages/format.vue`

**Interfaces:**
- Consumes: the API-backed `useQuizDb`.
- Produces: no Drive endpoints, buttons, nav links, env vars, or Dexie imports remain.

- [ ] **Step 1: Remove Drive from `index.vue`**

Delete the `useGoogleDrive` import, `isSaving`, `isLoading`, `saveFeedback`, `loadFeedback`, `driveError`, `flashFeedback`, `handleSaveAll`, `handleLoadAllFromDrive`, the Save/Load button group, and the Drive error paragraph. Keep search, sort, create menu, share, edit, delete, and import intact. Drop `upsertImportedQuiz` from the `useQuizDb` destructure.

- [ ] **Step 2: Remove Drive from `ShareModal.vue`**

Delete `useGoogleDrive`, `isBusy`, `saving`, `driveMessage`, `handleSaveToDrive`, and the "Save File to Drive" button/message block. Keep download, copy, preview.

- [ ] **Step 3: Remove the Drive nav link**

In `AppHeader.vue`, delete `{ label: "Drive", to: "/setup" }` from `navLinks`.

- [ ] **Step 4: Clean config and delete Drive/Dexie files**

- `nuxt.config.ts`: remove the `runtimeConfig` block.
- Delete `app/composables/useGoogleDrive.ts`, `app/pages/setup.vue`, `app/utils/db.ts`, `app/utils/quizValidation.ts`.
- Remove `dexie` from `package.json` and run `pnpm install`.

- [ ] **Step 5: Rewrite false copy**

In `about.vue` and `format.vue`, replace "no server", "works offline", "saved on this device", and similar claims with: quizzes are stored in a local SQLite database on the machine running JustQuiz, and the app needs its local server running. Keep the AI-import story and quiz-playing descriptions.

- [ ] **Step 6: Verify no Drive references remain in the app**

```bash
rg -i "google|drive|dexie|indexeddb" app server nuxt.config.ts package.json .env.example
```

Expected: no matches (the design/plan docs are outside these paths). `rg -i "offline" app README.md` should only show acceptable phrasing, if any.

- [ ] **Step 7: Typecheck and smoke test**

Run: `pnpm typecheck && pnpm dev`
Expected: no type errors; dashboard has no Save/Load buttons; Share shows download/copy only; nav has About, Format, Dashboard; all other flows work.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove Google Drive and Dexie, update offline copy"
```

---

### Task 11: Node server configuration and build

**Files:**
- Modify: `nuxt.config.ts`
- Modify: `package.json` (only if a script was missed in Task 2)

**Interfaces:**
- Consumes: API routes and the DB plugin.
- Produces: `pnpm build` emits a Node server; `pnpm preview` serves the SPA and `/api` on port 3000.

- [ ] **Step 1: Remove static-site configuration**

In `nuxt.config.ts`, delete `nitro.preset: "static"` and the entire `nitro.prerender` block. Keep `ssr: false`, the base-URL normalisation, modules, PWA config, and fonts.

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: build succeeds with a `.output/server/index.mjs`.

- [ ] **Step 3: Run the production server**

```bash
pnpm preview
curl -s localhost:3000/api/quizzes
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/
```

Expected: the seeded quiz array and `200`.

- [ ] **Step 4: Verify the DB path from the built server**

Run: `export JUSTQUIZ_DB_PATH=./data/alt.db; pnpm db:reset; pnpm preview`, then `curl localhost:3000/api/quizzes`.
Expected: the seeded quiz is served from `data/alt.db`. Delete `data/alt.db*` afterwards, then `unset JUSTQUIZ_DB_PATH`.

- [ ] **Step 5: Commit**

```bash
git add nuxt.config.ts package.json
git commit -m "build: serve the app and API from the Nitro node server"
```

---

### Task 12: Continuous integration

**Files:**
- Delete: `.github/workflows/deploy.yml`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: all scripts.
- Produces: green CI on pushes and PRs.

- [ ] **Step 1: Replace the Pages deploy workflow**

Delete `.github/workflows/deploy.yml`. Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 2: Push and verify**

```bash
git checkout -b ci/github-actions
git add .github/workflows
git commit -m "ci: replace Pages deploy with typecheck, test, and build"
git push -u origin ci/github-actions
```

Open a PR into your fork; confirm the `verify` job passes on Node 24. If `node:sqlite` is unavailable there, bump the matrix to Node 26 and update `engines` in the same PR.

- [ ] **Step 3: Merge and sync**

Merge the PR, then `git checkout master && git pull`.

---

### Task 13: Documentation and final smoke checklist

**Files:**
- Modify: `README.md`
- Create: `docs/requirements.md`
- Create: `docs/database.md`
- Create: `docs/api.md`

**Interfaces:**
- Consumes: the finished system.
- Produces: review-ready documentation.

- [ ] **Step 1: Rewrite `README.md`**

Include: fork attribution and upstream link; what changed from upstream; prerequisites (Node >=24, pnpm); setup (`pnpm install`, `pnpm db:reset`, `pnpm dev`); DB location and how to open `data/justquiz.db` in DB Browser for SQLite; scripts table; API summary; architecture diagram (Vue SPA → Nitro → SQLite); limitations (local server required, single-user, no cloud sync); assignment context.

- [ ] **Step 2: Write `docs/requirements.md`**

Port the agreed functional requirements table (FR-01 … FR-56) covering onboarding, format guidance, import, authoring/management, playback, resume, export, PWA install, and theming — with Drive requirements removed. Add a short traceability note mapping each group to its UI/route.

- [ ] **Step 3: Write `docs/database.md`**

Paste the schema, a Mermaid ER diagram, the mapping rules (including ID policy and normalise-before-validate), and step-by-step DB Browser instructions (`pnpm db:reset`, open `data/justquiz.db`, inspect `quiz_overview`).

- [ ] **Step 4: Write `docs/api.md`**

Endpoint table with request/response examples, the 400 error shape `{ errors: string[] }`, and `curl` examples.

- [ ] **Step 5: Run the full verification suite**

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm db:reset
```

Then manual checklist:
- DB Browser shows 4 content tables + `quiz_overview` + `schema_migrations` with seeded rows.
- Import sample JSON → new rows; invalid import → errors, no rows.
- Create, edit, delete; play all four question types; resume after navigating away; finish and review score.
- Search and all six sort options.
- Download/copy JSON from Share.
- No Drive UI anywhere.

- [ ] **Step 6: Commit and open the final PR**

```bash
git checkout -b docs/requirements-and-schema
git add README.md docs/requirements.md docs/database.md docs/api.md
git commit -m "docs: describe local architecture, schema, API, and requirements"
git push -u origin docs/requirements-and-schema
```

Open the PR, confirm CI is green, merge into `master`.

---

## Self-Review Notes

- **Spec coverage:** fork/Git (Task 1), scripts/ignores (2), shared types/validation (3), DB/migrations (4), repository (5), API (6), seed (7), frontend data layer (8), editor rules (9), Drive removal + copy (10), node build (11), CI (12), docs (13), PWA honesty (10/13), tests (3, 4, 5, 6, 8). No `/database` viewer, per the spec's default.
- **Review Focus mapping:** #1 Task 5 create-twice test; #2 Task 3 true/false test; #3 Task 8 `updatePartial` test; #4 Task 5 cascade test; #5 Task 5 prefix test.
- **Type consistency:** `QuizInput` is used by the repository, service, API adapter, and editor. `remove` is the repository/service delete name; `deleteQuiz` remains the composable name. `getByShortPrefix` is server-side; `getByShortId` is client-side.
