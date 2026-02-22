import { createRemoteJWKSet, jwtVerify } from 'jose';
import { okAsync, ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';

import { httpErr } from './response';
import type { HttpError } from './types';

export const validateAccess = (
	req: Readonly<Request>,
	env: ReadonlyDeep<Record<string, unknown>>,
): ResultAsync<void, HttpError> => {
	const policyAud = typeof env['POLICY_AUD'] === 'string' ? env['POLICY_AUD'] : undefined;
	if (!policyAud) return okAsync(undefined);

	const token = req.headers.get('cf-access-jwt-assertion');
	if (!token) return httpErr(401, 'Missing access token');

	const teamDomain = typeof env['CF_TEAM_DOMAIN'] === 'string' ? env['CF_TEAM_DOMAIN'] : undefined;
	if (!teamDomain) return httpErr(500, 'CF_TEAM_DOMAIN not configured');

	const jwksUrl = new URL(`https://${teamDomain}/cdn-cgi/access/certs`);
	const JWKS = createRemoteJWKSet(jwksUrl);

	return ResultAsync.fromPromise(
		jwtVerify(token, JWKS, {
			audience: policyAud,
			issuer: `https://${teamDomain}`,
		}),
		(error) => ({
			type: 'http' as const,
			status: 403,
			message: error instanceof Error ? error.message : 'Token verification failed',
		}),
	).map(() => undefined);
};
