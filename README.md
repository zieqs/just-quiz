# JustQuiz — Local SQLite Edition

An offline-friendly quiz practice app for the browser, backed by a **local SQLite database** instead of cloud storage. Paste AI-generated quiz JSON, play it, and inspect every row in the database with any SQLite tool.

This is a coursework fork of [4yami/just-quiz](https://github.com/4yami/just-quiz), with the original Google Drive backup feature replaced by a local Nuxt/Nitro API and a SQLite file.

> **Attribution:** the original application, UI, and quiz-playing logic belong to the upstream project. This fork changes the persistence layer for a Software Quality and Configuration Management assignment.

## What changed from upstream

| Upstream | This fork |
|---|---|
| Quizzes stored in IndexedDB via Dexie | Quizzes stored in `data/justquiz.db` (SQLite) |
| Optional Google Drive OAuth backup | Removed entirely |
| Static SPA deployable to GitHub Pages | Nuxt/Nitro server serving both the SPA and `/api` |
| Browser-only data access | Inspectable SQL schema, migrations, and rows |

The UI, quiz editor, import parser, scoring, resume behaviour, and PWA shell are preserved.

## Features

- **AI-first import** — paste JSON, drop a `.json` file, or load the sample. Tolerant parser handles markdown fences, smart quotes, rich-text paste, stringified JSON, and JS-object output.
- **Validation** — every quiz is checked on the client and again on the server before it is written.
- **Four question types** — single choice, multiple choice, true/false, and short answer.
- **Create, edit, delete, search, and sort** quizzes from the dashboard.
- **Quiz player** — immediate feedback, explanations, progress, resume, and a final score review.
- **Local database** — normalised tables the lecturer can open with DB Browser for SQLite.
- **Installable PWA** — assets are still installable, but quiz data requires the local server.
- **Dark / light theme** with system preference detection.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Nuxt 4.5 (Vue 3, TypeScript) |
| Server | Nitro (Nuxt server routes) |
| Database | SQLite via Node's built-in `node:sqlite` (Node >= 24) |
| Styling | Tailwind CSS 3 |
| PWA | `@vite-pwa/nuxt` |
| Tests | Vitest |

## Architecture

```
┌──────────────────────────────┐
│  Vue 3 SPA (ssr: false)      │
│  pages / components          │
└──────────────┬───────────────┘
               │ $fetch
┌──────────────▼───────────────┐
│  Nitro API  /api/quizzes     │
│  validation + service layer  │
└──────────────┬───────────────┘
               │ node:sqlite
┌──────────────▼───────────────┐
│  data/justquiz.db            │
│  quizzes · questions         │
│  choices · accepted_answers  │
└──────────────────────────────┘
```

## Getting started

Prerequisites: **Node.js >= 24** and **pnpm 11**.

```bash
pnpm install
pnpm db:reset     # create the database and insert the sample quiz
pnpm dev          # http://localhost:3000
```

For a production-style run:

```bash
pnpm build
pnpm preview      # node .output/server/index.mjs
```

## Inspecting the database

The database lives at `data/justquiz.db` by default. Override it with `JUSTQUIZ_DB_PATH`.

1. Run `pnpm db:reset` (creates and seeds the file).
2. Open `data/justquiz.db` in [DB Browser for SQLite](https://sqlitebrowser.org/).
3. Inspect the tables `quizzes`, `questions`, `choices`, `accepted_answers`, and the view `quiz_overview`.

Quick command-line check:

```bash
sqlite3 data/justquiz.db "SELECT * FROM quiz_overview;"
```

See [docs/database.md](docs/database.md) for the schema and mapping rules.

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/quizzes` | list all quizzes |
| POST | `/api/quizzes` | create a quiz |
| GET | `/api/quizzes/:id` | read one quiz |
| PUT | `/api/quizzes/:id` | replace a quiz |
| DELETE | `/api/quizzes/:id` | delete a quiz |
| GET | `/api/quizzes/short/:prefix` | resolve a short ID |

Validation failures return `400` with `{ "errors": ["..."] }`. See [docs/api.md](docs/api.md).

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | development server (UI + API) |
| `pnpm build` | build the Nitro server and client |
| `pnpm preview` | run the built server |
| `pnpm typecheck` | Vue + TypeScript checks |
| `pnpm test` | Vitest suite |
| `pnpm db:migrate` | apply pending SQL migrations |
| `pnpm db:seed` | insert the sample quiz (idempotent) |
| `pnpm db:reset` | delete, migrate, and seed the database |

## Project structure

```
app/                 Vue SPA (pages, components, composables)
server/api/          Nitro route handlers
server/utils/        database, migrations, repository, service
shared/              types, normalisation, validation used by app + server
db/migrations/       SQL schema migrations
db/seed.sql          sample quiz
scripts/             migrate / seed / reset scripts
docs/                requirements, database, and API documentation
tests/               Vitest suites
data/justquiz.db     local database (git-ignored)
```

## Requirements

Functional requirements are catalogued in [docs/requirements.md](docs/requirements.md) (FR-01 … FR-50), grouped by onboarding, import, authoring, playback, resume, export, persistence, and PWA behaviour.

## Limitations

- Single-user and local-only: there is no authentication or cloud sync.
- Quiz data is not available offline; the local server must be running. The PWA shell can still be installed.
- The GitHub Pages deployment workflow was removed because a SQLite backend cannot run there.
- The `/quiz/<title>-<shortId>` URL only resolves against the local database.

## License and coursework

The upstream repository describes itself as a private project. This fork is submitted for coursework with attribution. Do not redistribute the upstream code beyond the assignment without the original author's permission.
