# Functional Requirements

Scope: the local SQLite edition of JustQuiz. Requirements inherited from the upstream app are retained where the behaviour is unchanged; Google Drive and cloud-sync requirements are intentionally removed.

## A. Onboarding & navigation

| ID | Requirement |
|---|---|
| FR-01 | On the first visit, redirect the dashboard to `/about` and record `justquiz:hasVisited` so the redirect happens only once per browser. |
| FR-02 | Provide persistent navigation to About, Format guide, and Dashboard. |
| FR-03 | Provide a light/dark theme toggle that starts from the system preference and persists the user's choice. |
| FR-04 | Show a "Resume quiz" banner for the most recently active session, hidden while already on a quiz page. |
| FR-05 | Operate as a client-side SPA with the quiz API served from the same origin and no user accounts. |

## B. Format guidance

| ID | Requirement |
|---|---|
| FR-06 | Document the quiz JSON shape: `title` (required), `description` (optional), `questions[]` (required). |
| FR-07 | Document all four question types: `single`, `multiple`, `true_false`, `short_answer`. |
| FR-08 | Provide a copyable sample JSON and a copyable AI prompt that instructs an external chatbot to emit valid JSON. |
| FR-09 | Explain that imports are validated and that invalid data is never saved. |

## C. Import & validation

| ID | Requirement |
|---|---|
| FR-10 | Accept quiz JSON by paste, file picker (`.json`), or drag-and-drop. |
| FR-11 | Tolerate common AI output problems: markdown fences, BOM, HTML/rich-text paste, `&nbsp;`, non-breaking spaces, smart quotes, prose around the object, stringified JSON, and JS object-literal syntax. |
| FR-12 | Reject empty input, top-level arrays, and non-object JSON with a friendly, actionable error. |
| FR-13 | Validate the quiz: non-empty title; at least one question; non-empty question text; a valid type; at least two non-blank choices for choice questions; in-range `correctIndices`; at least one non-blank accepted answer for `short_answer`. |
| FR-14 | Display all validation errors at once and save nothing when validation fails. |
| FR-15 | Normalise defaults before validation: missing type becomes `single`; `true_false` without choices becomes `["True","False"]`; scalar `correctIndex`/`acceptedAnswer` become arrays; missing IDs are generated. |
| FR-16 | Re-validate and normalise on the server; the API rejects invalid payloads with `400` and a list of errors. |
| FR-17 | Offer a sample quiz inside the import dialog for testing. |

## D. Authoring & management

| ID | Requirement |
|---|---|
| FR-18 | Create a quiz from scratch in a visual editor. |
| FR-19 | Add, remove, and reorder questions; switch question types; add/remove choices or accepted answers; choose correct answers; add explanations. |
| FR-20 | Run the shared validator on editor save and show the error list instead of browser alerts. |
| FR-21 | Edit an existing quiz while preserving its `id` and `createdAt`; update `updatedAt`. |
| FR-22 | Delete a quiz only after explicit confirmation, with a cascading database delete. |
| FR-23 | List quizzes newest-first with title, description, and question count. |
| FR-24 | Search quizzes case-insensitively across title and description. |
| FR-25 | Sort by newest, oldest, title A-Z, title Z-A, most questions, or fewest questions; show distinct empty and no-results states. |

## E. Quiz playback

| ID | Requirement |
|---|---|
| FR-26 | Resolve `/quiz/<title-slug>-<8-char-id>` against the database using the ID prefix. |
| FR-27 | Show a "Quiz Not Found" state when the quiz no longer exists and clear stale session data. |
| FR-28 | Render the correct input for each type: single-select, multi-select, true/false, or text input. |
| FR-29 | Allow backward navigation and prevent changing an answer after it has been checked. |
| FR-30 | Evaluate answers: exact index for single/true-false, exact set match for multiple, case-insensitive trimmed match for short answer. |
| FR-31 | After checking, show correct/incorrect feedback, the correct answer, and the explanation when present. |
| FR-32 | Show question number, total, and a live progress bar. |
| FR-33 | On finish, show the percentage and "X of Y correct". |
| FR-34 | Provide a per-question review with correctness, type label, and explanation. |
| FR-35 | Allow restarting the quiz and confirm before exiting mid-quiz. |

## F. Progress & resume

| ID | Requirement |
|---|---|
| FR-36 | Persist progress per quiz (current index, answers, checked/finished flags, timestamp) in module state and `sessionStorage`. |
| FR-37 | Restore progress after navigating away or refreshing within the same tab. |
| FR-38 | Clamp a restored index when the quiz's question count has shrunk. |
| FR-39 | Clear the session on finish, explicit exit, or when the quiz no longer exists. |

## G. Sharing & export

| ID | Requirement |
|---|---|
| FR-40 | Provide a share dialog with a read-only JSON preview. |
| FR-41 | Download the quiz as a `.json` file. |
| FR-42 | Copy the quiz JSON to the clipboard. |

## H. Persistence & API

| ID | Requirement |
|---|---|
| FR-43 | Store quizzes in SQLite with normalised `quizzes`, `questions`, `choices`, and `accepted_answers` tables, foreign keys, and cascade deletes. |
| FR-44 | Expose REST endpoints for list, create, read, update, delete, and short-ID lookup under `/api/quizzes`. |
| FR-45 | Return `400 { errors: string[] }` for invalid payloads and `404` for missing quizzes. |
| FR-46 | Provide `db:migrate`, `db:seed`, and `db:reset` scripts and document how to inspect the database with DB Browser for SQLite. |

## I. PWA & quality

| ID | Requirement |
|---|---|
| FR-47 | Support installation as a PWA: `beforeinstallprompt` on Android/Chrome and manual "Add to Home Screen" guidance on iOS. |
| FR-48 | Precache app-shell assets so the interface loads offline; quiz data still requires the local server. |
| FR-49 | Follow the OS theme on first load and avoid a flash of the wrong theme. |
| FR-50 | Provide automated Vitest coverage for validation, migrations, the repository, the service, and the API adapter, and run typecheck, tests, and build in CI. |

## Traceability

| Requirement group | Primary implementation |
|---|---|
| FR-01 … FR-05 | `app/pages/index.vue`, `app/pages/about.vue`, `app/components/AppHeader.vue`, `useFirstVisit`, `useColorMode` |
| FR-06 … FR-09 | `app/pages/format.vue`, `app/components/ImportModal.vue`, `app/utils/sampleQuiz.ts` |
| FR-10 … FR-17 | `app/components/ImportModal.vue`, `app/utils/parseQuizJson.ts`, `shared/quiz.ts`, `server/utils/quizService.ts` |
| FR-18 … FR-25 | `app/components/QuizEditor.vue`, `app/pages/quiz/new.vue`, `app/pages/quiz/edit/[slug].vue`, `app/pages/index.vue` |
| FR-26 … FR-35 | `app/pages/quiz/[slug].vue`, `app/components/QuizPlayer.vue` |
| FR-36 … FR-39 | `app/composables/useQuizSession.ts`, `app/components/AppHeader.vue` |
| FR-40 … FR-42 | `app/components/ShareModal.vue` |
| FR-43 … FR-46 | `db/migrations/001_init.sql`, `server/utils/*`, `server/api/quizzes/*`, `scripts/*` |
| FR-47 … FR-50 | `nuxt.config.ts`, `app/composables/usePwaInstall.ts`, `tests/*`, `.github/workflows/ci.yml` |
