# Mailroom HTTP API

All endpoints return JSON with a consistent envelope.

## Authentication

Optional Cloudflare Access JWT verification. Controlled by environment variables:

- **`POLICY_AUD`** — Cloudflare Access Application Audience tag. When set, all requests must include a valid JWT.
- **`CF_TEAM_DOMAIN`** — Cloudflare Access team domain (e.g., `myteam.cloudflareaccess.com`). Required when `POLICY_AUD` is set.

When neither is set, auth is bypassed (local development mode).

JWT must be passed in the `cf-access-jwt-assertion` header (automatically set by Cloudflare Access).

## Response Envelope

**Success:**

```json
{ "ok": true, "data": { ... } }
```

**Error:**

```json
{ "ok": false, "error": { "type": "http", "message": "..." } }
```

Error types: `http`, `network`, `validation`, `jmap`.

## Endpoints

### POST /init

Initialize the JMAP state cursor. Queries the oldest unread email and stores the JMAP state in KV.

**Responses:**

| Status | Condition                                       |
| ------ | ----------------------------------------------- |
| 200    | Success — returns `{ email, state }`            |
| 404    | No unread emails found                          |
| 409    | Already initialized (state cursor exists in KV) |
| 502    | KV or JMAP operation failed                     |

### GET /emails/unenriched

Query emails that haven't been enriched yet (missing `$enriched` keyword).

**Query Parameters:**

| Param       | Type              | Default | Description                       |
| ----------- | ----------------- | ------- | --------------------------------- |
| `from`      | string            | —       | Filter by sender (partial match)  |
| `subject`   | string            | —       | Filter by subject (partial match) |
| `before`    | ISO 8601 datetime | —       | Emails received before this date  |
| `after`     | ISO 8601 datetime | —       | Emails received after this date   |
| `limit`     | integer (1–100)   | 50      | Max results                       |
| `inMailbox` | string            | —       | Filter by mailbox ID              |

**Responses:**

| Status | Condition                             |
| ------ | ------------------------------------- |
| 200    | Success — returns `{ emails, state }` |
| 400    | Invalid query parameters              |
| 502    | JMAP operation failed                 |

### POST /emails/enrich

Fetch emails by ID and group by sender domain (preparation for enrichment pipeline).

**Request Body:**

```json
{ "ids": ["email-id-1", "email-id-2"] }
```

`ids` must be a non-empty array of non-empty strings.

**Responses:**

| Status | Condition                                                            |
| ------ | -------------------------------------------------------------------- |
| 200    | Success — returns `{ domains, totalEmails, totalDomains, notFound }` |
| 400    | Invalid request body                                                 |
| 500    | JMAP operation failed                                                |

## Status Codes

| Code | Meaning                                            |
| ---- | -------------------------------------------------- |
| 200  | Success                                            |
| 400  | Validation error (bad input)                       |
| 401  | Missing access token                               |
| 403  | Access denied (invalid JWT)                        |
| 404  | Not found (unknown path)                           |
| 405  | Method not allowed (known path, wrong HTTP method) |
| 409  | Conflict (resource already exists)                 |
| 500  | Internal / JMAP error                              |
| 502  | Upstream failure (network / KV)                    |
