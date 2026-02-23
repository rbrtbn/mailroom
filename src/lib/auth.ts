import { createRemoteJWKSet, jwtVerify } from 'jose';
import { okAsync, ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';

import { httpErr } from './response';
import type { AccessConfig, HttpError } from './types';

// Cache avoids re-constructing the keyset function and URL object per request.
// jose has its own internal JWKS cache, but this eliminates the setup overhead.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

const getJwks = (teamDomain: string) => {
	const cached = jwksCache.get(teamDomain);
	if (cached) return cached;
	const jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
	// eslint-disable-next-line functional/immutable-data
	jwksCache.set(teamDomain, jwks);
	return jwks;
};

export const validateAccess = (
	req: Readonly<Request>,
	config: ReadonlyDeep<AccessConfig>,
): ResultAsync<void, HttpError> => {
	// Auth is opt-in: skip JWT verification when POLICY_AUD is not configured.
	// In production, POLICY_AUD is always set via wrangler secrets.
	// Bypass only applies to local dev where the env var is absent.
	if (config.mode === 'bypass') {
		const { pathname } = new URL(req.url);
		console.warn('auth:bypass — POLICY_AUD not configured', {
			pathname,
			note: 'Set POLICY_AUD and CF_TEAM_DOMAIN to enforce Cloudflare Access in production',
		});
		return okAsync(undefined);
	}

	const token = req.headers.get('cf-access-jwt-assertion');
	if (token === null) return httpErr(401, 'Missing access token');

	return ResultAsync.fromPromise(
		jwtVerify(token, getJwks(config.cfTeamDomain), {
			audience: config.policyAud,
			issuer: `https://${config.cfTeamDomain}`,
		}),
		(error) => {
			console.error('auth:verify_failed', {
				message: error instanceof Error ? error.message : 'Token verification failed',
			});
			return { type: 'http' as const, status: 403 as const, message: 'Access denied' };
		},
	).map(() => undefined);
};
