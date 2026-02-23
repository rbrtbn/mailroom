import type { ReadonlyDeep } from 'type-fest';
import { describe, expect, it } from 'vitest';

import { validateAccess } from './auth';
import type { AccessConfig } from './types';

const makeRequest = (headers?: ReadonlyDeep<Record<string, string>>) =>
	new Request('https://example.com', { headers });

describe('validateAccess', () => {
	it('bypasses auth when config has no policyAud', async () => {
		const config: AccessConfig = {};
		const result = await validateAccess(makeRequest(), config);
		expect(result.isOk()).toBe(true);
	});

	it('returns 401 when policyAud is set but no token header', async () => {
		const config: AccessConfig = { policyAud: 'test-aud' };
		const result = await validateAccess(makeRequest(), config);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.status).toBe(401);
			expect(result.error.message).toBe('Missing access token');
		}
	});

	it('returns 500 when policyAud is set with token but no cfTeamDomain', async () => {
		const config: AccessConfig = { policyAud: 'test-aud' };
		const req = makeRequest({ 'cf-access-jwt-assertion': 'some-token' });
		const result = await validateAccess(req, config);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.status).toBe(500);
			expect(result.error.message).toBe('CF_TEAM_DOMAIN not configured');
		}
	});
});
