import { ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';

import { handleEnrich, handleInit, handleUnenriched } from './handlers';
import { createJmapClient, type JmapClient } from './jmap/client';
import { validateAccess } from './lib/auth';
import { parseEnv } from './lib/env';
import { jsonErr, jsonFromHandlerError } from './lib/response';
import type { AccessConfig, ErrorResult, Handler, HandlerError } from './lib/types';

const toAccessConfig = (env: ReadonlyDeep<Record<string, unknown>>): AccessConfig => ({
	policyAud: typeof env['POLICY_AUD'] === 'string' ? env['POLICY_AUD'] : undefined,
	cfTeamDomain: typeof env['CF_TEAM_DOMAIN'] === 'string' ? env['CF_TEAM_DOMAIN'] : undefined,
});

const getFastmailClient = (() => {
	// eslint-disable-next-line functional/no-let
	let cached: ResultAsync<JmapClient, ErrorResult> | undefined;
	return (env: ReadonlyDeep<Env>): ResultAsync<JmapClient, ErrorResult> => {
		if (cached) return cached;
		console.info('jmap:client_init');
		cached = parseEnv(env).andThen((validEnv) =>
			createJmapClient('https://api.fastmail.com', validEnv.FASTMAIL_TOKEN),
		);
		return cached.mapErr((error) => {
			console.error('jmap:client_init_failed', { error: error.message });
			cached = undefined;
			return error;
		});
	};
})();

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
		console.info('request:start', { method: req.method, pathname });

		const handler = resolveHandler(req.method, pathname);
		if (!handler) {
			console.info('request:unmatched', { method: req.method, pathname });
			return jsonErr('http', 'Not found', 404);
		}

		return validateAccess(req, toAccessConfig(env as unknown as Record<string, unknown>))
			.andThen(() => getFastmailClient(env))
			.andThen((client) =>
				ResultAsync.fromPromise(handler(req, env, client), (error): HandlerError => {
					console.error('handler:uncaught', {
						pathname,
						error: error instanceof Error ? error.message : 'unknown',
					});
					return {
						type: 'network',
						message: error instanceof Error ? error.message : 'Unexpected handler error',
					};
				}),
			)
			.match(
				(response) => {
					console.info('request:complete', { pathname, status: response.status });
					return response;
				},
				(error) => {
					console.error('request:error', { pathname, error: error.type, message: error.message });
					return jsonFromHandlerError(error);
				},
			);
	},

	// eslint-disable-next-line @typescript-eslint/require-await
	async scheduled(_event, _env, _ctx) {
		console.info('cron:triggered');
		// Cron handler — not yet implemented
	},
} satisfies ExportedHandler<Env>;
