# Submissions API — Request/Response Examples

Reference examples for the `submissions` endpoints (`backend/api/routers/submissions.py`).
Base URL below assumes the API running directly on `http://localhost:8000`, with the `/api/v1`
prefix that `backend/api/main.py` applies to every router. The reverse proxy in
`nginx/nginx.conf` forwards `/api/...` through unchanged, so the same path also works there.

---

## `POST /submissions`

Creates a new submission (a filled-out form). `formId` is required; everything else is optional
and free-form (`patientData`, `answers`, `checkboxAnswers`, `closingData` accept any keys/values).

### Request

```bash
curl -X POST http://localhost:8000/api/v1/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "1",
    "formName": "Cirurgia Segura",
    "entity": "ent_500",
    "patientData": {
      "name": "João da Silva",
      "birthDate": "1980-05-12",
      "record": "123456",
      "room": "Sala 3"
    },
    "answers": {
      "q2": "q2_a",
      "q22_d": "12",
      "q22_e": "12"
    },
    "checkboxAnswers": {
      "q1_a": true,
      "q1_b": true
    },
    "closingData": {
      "date": "2026-07-24",
      "responsible": "Enf. Maria Souza"
    },
    "status": "completed"
  }'
```

### Response — `201 Created`

```json
{
  "formId": "1",
  "formName": "Cirurgia Segura",
  "entity": "ent_500",
  "patientData": {
    "name": "João da Silva",
    "birthDate": "1980-05-12",
    "record": "123456",
    "room": "Sala 3"
  },
  "answers": {
    "q2": "q2_a",
    "q22_d": "12",
    "q22_e": "12"
  },
  "checkboxAnswers": {
    "q1_a": true,
    "q1_b": true
  },
  "closingData": {
    "date": "2026-07-24",
    "responsible": "Enf. Maria Souza"
  },
  "status": "completed",
  "_id": "66a1f3c2b8e4a1d2c3f4a5b6",
  "submittedAt": "2026-07-24T18:32:10.123456Z"
}
```

### Error — unknown field → `422 Unprocessable Entity`

Request body includes a field not defined on `SubmissionCreate` (e.g. `"unexpectedField": "nope"`).
Models use `extra="forbid"`, so unknown top-level fields are rejected:

```json
{
  "detail": [
    {
      "type": "extra_forbidden",
      "loc": ["body", "unexpectedField"],
      "msg": "Extra inputs are not permitted",
      "input": "nope"
    }
  ]
}
```

### Error — missing required field → `422 Unprocessable Entity`

Request body omits `formId`:

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "formId"],
      "msg": "Field required",
      "input": {"answers": {}}
    }
  ]
}
```

---

## `GET /submissions`

Lists submissions, newest first (sorted by `submittedAt` descending). Optional query params:
`formId`, `entity`, `status` (`draft` | `completed`), `limit` (default `100`, max `500`).

### Request — no filters

```bash
curl http://localhost:8000/api/v1/submissions
```

### Response — `200 OK`

```json
{
  "submissions": [
    {
      "formId": "1",
      "formName": "Cirurgia Segura",
      "entity": "ent_500",
      "patientData": {
        "name": "João da Silva",
        "birthDate": "1980-05-12",
        "record": "123456",
        "room": "Sala 3"
      },
      "answers": {
        "q2": "q2_a",
        "q22_d": "12",
        "q22_e": "12"
      },
      "checkboxAnswers": {
        "q1_a": true,
        "q1_b": true
      },
      "closingData": {
        "date": "2026-07-24",
        "responsible": "Enf. Maria Souza"
      },
      "status": "completed",
      "_id": "66a1f3c2b8e4a1d2c3f4a5b6",
      "submittedAt": "2026-07-24T18:32:10.123456Z"
    }
  ]
}
```

### Request — filtered

```bash
curl "http://localhost:8000/api/v1/submissions?formId=1&status=completed&limit=10"
```

Response shape is identical to the unfiltered call, restricted to matches.

### Request — filter with no matches

```bash
curl "http://localhost:8000/api/v1/submissions?formId=does-not-exist"
```

### Response — `200 OK` (empty list, not a 404)

```json
{
  "submissions": []
}
```

---

## `GET /submissions/{submission_id}`

Fetches a single submission by its Mongo `_id`.

### Request — found

```bash
curl http://localhost:8000/api/v1/submissions/66a1f3c2b8e4a1d2c3f4a5b6
```

### Response — `200 OK`

```json
{
  "formId": "1",
  "formName": "Cirurgia Segura",
  "entity": "ent_500",
  "patientData": {
    "name": "João da Silva",
    "birthDate": "1980-05-12",
    "record": "123456",
    "room": "Sala 3"
  },
  "answers": {
    "q2": "q2_a",
    "q22_d": "12",
    "q22_e": "12"
  },
  "checkboxAnswers": {
    "q1_a": true,
    "q1_b": true
  },
  "closingData": {
    "date": "2026-07-24",
    "responsible": "Enf. Maria Souza"
  },
  "status": "completed",
  "_id": "66a1f3c2b8e4a1d2c3f4a5b6",
  "submittedAt": "2026-07-24T18:32:10.123456Z"
}
```

### Error — malformed id → `404 Not Found`

```bash
curl http://localhost:8000/api/v1/submissions/not-a-valid-objectid
```

```json
{
  "detail": "Submissão não encontrada"
}
```

### Error — well-formed but nonexistent id → `404 Not Found`

```bash
curl http://localhost:8000/api/v1/submissions/66a1f3c2b8e4a1d2c3f4a5b9
```

```json
{
  "detail": "Submissão não encontrada"
}
```

*(Both failure modes return the exact same 404 body — the endpoint does not distinguish
"invalid id format" from "id not found" in its response.)*

---

## `DELETE /submissions/{submission_id}`

Deletes a submission permanently.

### Request

```bash
curl -X DELETE http://localhost:8000/api/v1/submissions/66a1f3c2b8e4a1d2c3f4a5b6
```

### Response — `200 OK`

```json
{
  "mensagem": "Submissão removida com sucesso",
  "id": "66a1f3c2b8e4a1d2c3f4a5b6"
}
```

### Error — deleting again (or an id that never existed) → `404 Not Found`

```bash
curl -X DELETE http://localhost:8000/api/v1/submissions/66a1f3c2b8e4a1d2c3f4a5b6
```

```json
{
  "detail": "Submissão não encontrada"
}
```
