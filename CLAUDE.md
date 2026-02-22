# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mailroom is a Cloudflare Workers scheduled cron job that polls Fastmail via JMAP, enriches emails (language detection, categorization, translation), and sends notifications. It runs every 2 minutes. Currently in early development (Phase 1 of 5).

## Commands

| Task                      | Command                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| Install deps              | `pnpm install`                                                      |
| Dev server                | `pnpm dev`                                                          |
| Trigger scheduled handler | `curl "http://localhost:8787/__scheduled?cron=*/2+*+*+*+*"`         |
| Run tests                 | `pnpm test`                                                         |
| Run tests (watch)         | `pnpm test:watch`                                                   |
| Type check                | `pnpm typecheck`                                                    |
| Lint                      | `pnpm lint`                                                         |
| Deploy (dry run)          | `pnpm deploy:dry`                                                   |
| Deploy                    | `pnpm deploy`                                                       |
| Regenerate CF types       | `pnpm cf-typegen` (run after changing bindings in `wrangler.jsonc`) |

## Architecture

### Pure Core / Impure Shell

The codebase enforces a functional programming style via ESLint rules:

- **No `let`, no mutation, no classes** — `functional/no-let`, `functional/immutable-data`, `functional/no-classes` are all errors
- **Immutable parameters** — `functional/prefer-immutable-types` enforces `ReadonlyDeep` on function params
- **Sorted imports** — `simple-import-sort` plugin, enforced as errors

All fallible operations return `Result<T, E>` or `ResultAsync<T, E>` from `neverthrow` — no thrown exceptions in business logic. Errors use a discriminated union (`ErrorResult = NetworkError | ValidationError | JmapError`) defined in `src/lib/errors.ts`.

### Key Modules

- **`src/index.ts`** — Worker entry point with `fetch` and `scheduled` handlers. Singleton JMAP client cached across invocations.
- **`src/jmap/client.ts`** — IO boundary: JMAP session discovery, API calls. Uses back-references for batched queries.
- **`src/jmap/schemas.ts`** — Zod v4 schemas for JMAP responses.
- **`src/lib/env.ts`** — Validates `Env` bindings at startup via Zod, returns `ResultAsync`.
- **`src/lib/zod-neverthrow.ts`** — Bridge utilities: `safeFetch`, `safeJson`, `safeParse`.
- **`src/type-utils.ts`** — `Immutable<T>`, `InferImmutable<T>` type helpers.

### Path Alias

`~/*` maps to `./src/*` (e.g., `import { parseEnv } from '~/lib/env'`).

### Runtime

- **Target:** Cloudflare Workers (not Node.js) with `nodejs_compat` flag
- **Tests:** Vitest with `@cloudflare/vitest-pool-workers` — tests run inside real Workers runtime via Miniflare/workerd
- **KV binding:** `STATE_KV` stores JMAP delta cursor (`email:sinceState`)

### Key Dependencies

- `neverthrow` — typed `Result`/`ResultAsync` error handling
- `zod` (v4) — runtime schema validation
- `ts-pattern` — pattern matching (available, not yet used)

## Secrets

**NEVER** read, print, log, or load `.dev.vars`, `.env`, or any `*.vars*`/`*.env*` file. Reference `.env.example` for variable names. Secrets are managed via 1Password integration (`scripts/`) or `wrangler secret put`.

## Code Conventions

- Tabs for indentation, LF line endings
- Prefix unused parameters with `_` (e.g., `_event`, `_ctx`)
- Unused vars pattern also allows `Schema$` suffix (for Zod schemas used only as types)
- Use `satisfies` for type narrowing on exports (e.g., `satisfies ExportedHandler<Env>`)
- Exhaustive `switch` statements required (`@typescript-eslint/switch-exhaustiveness-check`)
- `object-shorthand: always` enforced

## Planned Architecture (from docs/PLAN.md)

See `docs/PLAN.md` for the full implementation roadmap. Upcoming phases include: JMAP delta polling with `sinceState`, email enrichment pipeline, DeepL translation, Pushover notifications, and a `/health` endpoint.
