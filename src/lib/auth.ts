import { createRemoteJWKSet, jwtVerify } from 'jose';
import { okAsync, ResultAsync } from 'neverthrow';

import { httpErr } from './response';
import type { AccessConfig, HttpError } from './types';

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
	config: AccessConfig,
): ResultAsync<void, HttpError> => {
	const { policyAud, cfTeamDomain } = config;
	// Auth is opt-in: skip JWT verification when POLICY_AUD is not configured (local dev).
	if (!policyAud) {
		console.warn('auth:bypass — POLICY_AUD not configured');
		return okAsync(undefined);
	}

	const token = req.headers.get('cf-access-jwt-assertion');
	if (!token) return httpErr(401, 'Missing access token');

	if (!cfTeamDomain) return httpErr(500, 'CF_TEAM_DOMAIN not configured');

	return ResultAsync.fromPromise(
		jwtVerify(token, getJwks(cfTeamDomain), {
			audience: policyAud,
			issuer: `https://${cfTeamDomain}`,
		}),
		(error) => {
			const message = error instanceof Error ? error.message : 'Token verification failed';
			console.error('auth:verify_failed', { message });
			return { type: 'http' as const, status: 403 as const, message };
		},
	).map(() => undefined);
};
