import { errAsync, type ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';

import { handleEnrich, handleInit, handleUnenriched } from './handlers';
import { createJmapClient, type JmapClient } from './jmap/client';
import { validateAccess } from './lib/auth';
import { parseEnv, type ValidEnv } from './lib/env';
import { jsonFromHandlerError, jsonOk, mkHttpError } from './lib/response';
import type { AccessConfig, ErrorResult, Handler, HandlerError } from './lib/types';

// ── Access config ───────────────────────────────────────────────────

const toAccessConfig = (env: ReadonlyDeep<ValidEnv>): AccessConfig => {
	if (env.POLICY_AUD === undefined) return { mode: 'bypass' };
	if (env.CF_TEAM_DOMAIN === undefined) {
		console.error(
			'auth:misconfigured — POLICY_AUD set without CF_TEAM_DOMAIN, falling back to bypass',
		);
		return { mode: 'bypass' };
	}
	return { mode: 'enforce', policyAud: env.POLICY_AUD, cfTeamDomain: env.CF_TEAM_DOMAIN };
};

// ── JMAP client singleton ───────────────────────────────────────────

const getFastmailClient = (() => {
	// eslint-disable-next-line functional/no-let
	let cached: ResultAsync<JmapClient, ErrorResult> | undefined;
	return (validEnv: ReadonlyDeep<ValidEnv>): ResultAsync<JmapClient, ErrorResult> => {
		if (cached) return cached;
		console.info('jmap:client_init');
		cached = createJmapClient('https://api.fastmail.com', validEnv.FASTMAIL_TOKEN).mapErr(
			(error) => {
				console.error('jmap:client_init_failed', { error: error.message });
				cached = undefined;
				return error;
			},
		);
		return cached;
	};
})();

// ── Router ──────────────────────────────────────────────────────────

const KNOWN_PATHS = new Set(['/init', '/emails/unenriched', '/emails/enrich']);

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

		return parseEnv(env)
			.andThen((validEnv) => {
				const handler = resolveHandler(req.method, pathname);
				if (!handler) {
					const status = KNOWN_PATHS.has(pathname) ? 405 : 404;
					const message = status === 405 ? 'Method not allowed' : 'Not found';
					console.info('request:unmatched', { method: req.method, pathname, status });
					return errAsync<unknown, HandlerError>(mkHttpError(status, message));
				}

				return validateAccess(req, toAccessConfig(validEnv))
					.andThen(() => getFastmailClient(validEnv))
					.andThen((client) => handler(req, env, client));
			})
			.match(
				(data) => {
					const response = jsonOk(data);
					console.info('request:complete', { pathname, status: response.status });
					return response;
				},
				(error) => {
					console.error('request:error', {
						pathname,
						error: error.type,
						message: error.message,
					});
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
