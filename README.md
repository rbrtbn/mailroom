# mailroom

Fastmail-first email enrichment pipeline on Cloudflare Workers. Categorizes, detects language, translates, and tags emails via JMAP.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/)
- A [Cloudflare](https://dash.cloudflare.com/sign-up) account (for deployment)

## Setup

```sh
pnpm install
pnpm setup
```

## Development

```sh
pnpm dev
```

KV storage is simulated locally — no Cloudflare account needed for development.

To trigger the scheduled handler locally:

```sh
curl "http://localhost:8787/__scheduled?cron=*/2+*+*+*+*"
```

## Deployment

Create a KV namespace and update `wrangler.jsonc` with the returned ID:

```sh
pnpm wrangler kv namespace create "mailroom-state"
```

Update the `id` in the `kv_namespaces` binding in `wrangler.jsonc` with the output.

Add your secrets to the deployed Worker:

```sh
pnpm wrangler secret put FASTMAIL_TOKEN
pnpm wrangler secret put DEEPL_API_KEY
pnpm wrangler secret put RESEND_API_KEY
pnpm wrangler secret put PUSHOVER_USER_KEY
pnpm wrangler secret put PUSHOVER_APP_TOKEN
```

Deploy:

```sh
pnpm deploy
```
