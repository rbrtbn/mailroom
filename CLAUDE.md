# CLAUDE.md

## Project Overview

Mailroom is a Cloudflare Workers scheduled cron job that polls Fastmail via JMAP, enriches emails (language detection, categorization, translation), and sends notifications. It runs every 2 minutes. Currently in early development (Phase 1 of 5).

## Commands

Standard commands via `package.json` scripts (`pnpm dev`, `pnpm test`, `pnpm lint`, etc). Non-obvious:

- Trigger scheduled handler locally: `curl "http://localhost:8787/__scheduled?cron=*/2+*+*+*+*"`
- Regenerate CF types after changing bindings: `pnpm generate-types`

## Architecture

**Pure core / impure shell.** All fallible operations return `Result<T, E>` or `ResultAsync<T, E>` from neverthrow — no thrown exceptions. Errors are a discriminated union with `type` field (`NetworkError | ValidationError | JmapError`) in `src/lib/types.ts`. IO helpers (`safeFetch`, `safeJson`, `safeParse`) live in `src/lib/fetch.ts`.

**Runtime:** Cloudflare Workers (not Node.js). Tests run inside Workers runtime via `@cloudflare/vitest-pool-workers`. KV binding `STATE_KV` stores the JMAP delta cursor.

**Zod v4** — import from `'zod/v4'`, not `'zod'`.

## Secrets

**NEVER** read, print, log, or load `.dev.vars`, `.env`, or any `*.vars*`/`*.env*` file. Reference `.env.example` for variable names. Secrets are managed via 1Password integration (`scripts/`) or `wrangler secret put`.

## Code Conventions

- Prefix unused parameters with `_` (e.g., `_event`, `_ctx`)
- `Schema$` suffix allowed for Zod schemas used only as types
- Use `satisfies` for type narrowing on exports (e.g., `satisfies ExportedHandler<Env>`)

## Roadmap

See `docs/PLAN.md` for the full implementation plan (phases 1–5).
