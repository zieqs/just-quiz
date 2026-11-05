# API Reference

Base URL: `http://localhost:3000/api` (development) or the same origin as the app.

The API is implemented with Nitro server routes under `server/api/quizzes/` and backed by the SQLite repository.

## Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/quizzes` | List every quiz, newest first |
| POST | `/api/quizzes` | Create a quiz |
| GET | `/api/quizzes/:id` | Read one quiz by full UUID |
| PUT | `/api/quizzes/:id` | Replace a quiz's content |
| DELETE | `/api/quizzes/:id` | Delete a quiz |
| GET | `/api/quizzes/short/:prefix` | Resolve a quiz by an ID prefix |

## Quiz payload

```json
{
  "title": "World Capitals Quiz",
  "description": "Test your geography knowledge!",
  "questions": [
    {
      "type": "single",
      "text": "What is the capital of France?",
      "choices": ["Paris", "London", "Berlin", "Madrid"],
      "correctIndices": [0],
      "explanation": "Paris is the capital of France."
    },
    {
      "type": "short_answer",
      "text": "What is the capital of Australia?",
      "acceptedAnswers": ["Canberra", "canberra"],
      "explanation": "Canberra is the capital of Australia, not Sydney."
    }
  ]
}
```

### Question types

| Type | Required fields |
|---|---|
| `single` | `choices` (>= 2), `correctIndices` (exactly one index) |
| `multiple` | `choices` (>= 2), `correctIndices` (>= 1 index) |
| `true_false` | `correctIndices`; `choices` optional and defaults to `["True","False"]` |
| `short_answer` | `acceptedAnswers` (>= 1 non-blank string) |

`explanation` is optional. `id`, timestamps, and missing defaults are filled in by the server.

## Create

```bash
curl -X POST http://localhost:3000/api/quizzes \
  -H 'content-type: application/json' \
  -d '{
    "title": "Smoke",
    "questions": [
      { "type": "single", "text": "Q", "choices": ["A","B"], "correctIndices": [0] }
    ]
  }'
```

`201 Created`

```json
{ "id": "2d98206c-cf4c-453a-8d7a-3e46b32f78ae" }
```

## Read

```bash
curl http://localhost:3000/api/quizzes/2d98206c-cf4c-453a-8d7a-3e46b32f78ae
```

```json
{
  "id": "2d98206c-cf4c-453a-8d7a-3e46b32f78ae",
  "title": "Smoke",
  "description": "",
  "createdAt": 1793873734834,
  "updatedAt": 1793873734834,
  "questions": [
    {
      "id": "86d445de-2814-4829-aa0e-95e09e600199",
      "type": "single",
      "text": "Q",
      "explanation": "",
      "choices": ["A", "B"],
      "correctIndices": [0],
      "acceptedAnswers": []
    }
  ]
}
```

## Update

`PUT` is a **full replacement** of the quiz content. The client adapter merges partial editor changes before sending the request.

```bash
curl -X PUT http://localhost:3000/api/quizzes/<id> \
  -H 'content-type: application/json' \
  --data-binary @quiz.json
```

`200 OK` → `{ "id": "<id>" }`

## Delete

```bash
curl -X DELETE http://localhost:3000/api/quizzes/<id>
```

`204 No Content` on success; `404` when the quiz does not exist. Cascade deletes remove questions, choices, and accepted answers.

## Short-ID lookup

```bash
curl http://localhost:3000/api/quizzes/short/2d98206c
```

Returns the quiz whose UUID starts with the supplied prefix, or `404`.

## Errors

| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "errors": ["Question 1: needs at least 2 \"choices\"."] }` | Validation or normalisation failed; nothing was written |
| 404 | `{ "statusCode": 404, "statusMessage": "Quiz not found" }` | Unknown ID or prefix |
| 500 | `{ "statusCode": 500, ... }` | Unexpected server/database error |

Validation runs after normalisation, so missing `type` and missing true/false choices are accepted, while empty titles, blank choices, out-of-range indices, and missing accepted answers are rejected.

## Health check

There is no dedicated health route; `GET /api/quizzes` doubles as one and returns `[]` for an empty database.
