import { type ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';

import { handleEnrich, handleInit, handleUnenriched } from './handlers';
import { createJmapClient, type JmapClient } from './jmap/client';
import { validateAccess } from './lib/auth';
import { parseEnv } from './lib/env';
import { jsonErr, jsonFromHandlerError } from './lib/response';
import type { ErrorResult } from './lib/types';

type Handler = (
	req: Readonly<Request>,
	env: ReadonlyDeep<Env>,
	client: ReadonlyDeep<JmapClient>,
) => Promise<Response>;

// eslint-disable-next-line functional/no-let
let fmClientResult: ResultAsync<JmapClient, ErrorResult> | undefined;

const getFastmailClient = (env: ReadonlyDeep<Env>) => {
	if (!fmClientResult) {
		fmClientResult = parseEnv(env).andThen((env) =>
			createJmapClient('https://api.fastmail.com', env.FASTMAIL_TOKEN),
		);
	}
	return fmClientResult;
};

const resolveHandler = (method: string, pathname: string): Handler | undefined => {
	const key = `${method} ${pathname}`;
	switch (key) {
		case 'POST /init':
			return handleInit;
		case 'GET /emails/unenriched':
			return handleUnenriched;
		case 'POST /emails/enrich':
			return handleEnrich;
		default:
			return undefined;
	}
};

export default {
	async fetch(req, env, _ctx) {
		const { pathname } = new URL(req.url);
		const handler = resolveHandler(req.method, pathname);
		if (!handler) return jsonErr('http', 'Not found', 404);

		return validateAccess(req, env as unknown as Record<string, unknown>)
			.andThen(() => getFastmailClient(env))
			.match(
				(client) => handler(req, env, client),
				(error) => jsonFromHandlerError(error),
			);
	},

	async scheduled(_event, _env, _ctx) {
		// Stub — will be implemented in Phase 2
	},
} satisfies ExportedHandler<Env>;
