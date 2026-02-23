import type { ReadonlyDeep } from 'type-fest';
import { describe, expect, it, vi } from 'vitest';

import { validateAccess } from './auth';
import type { AccessConfig } from './types';

const makeRequest = (headers?: ReadonlyDeep<Record<string, string>>) =>
	new Request('https://example.com', { headers });

describe('validateAccess', () => {
	it('bypasses auth when config mode is bypass', async () => {
		const config: AccessConfig = { mode: 'bypass' };
		const result = await validateAccess(makeRequest(), config);
		expect(result.isOk()).toBe(true);
	});

	it('returns 401 when mode is enforce but no token header', async () => {
		const config: AccessConfig = {
			mode: 'enforce',
			policyAud: 'test-aud',
			cfTeamDomain: 'test.cloudflareaccess.com',
		};
		const result = await validateAccess(makeRequest(), config);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.status).toBe(401);
			expect(result.error.message).toBe('Missing access token');
		}
	});

	it('returns 403 with generic message when JWT verification fails', async () => {
		vi.mock('jose', async (importOriginal) => {
			const original = await importOriginal<typeof import('jose')>();
			return {
				...original,
				jwtVerify: vi.fn().mockRejectedValue(new Error('JWT expired')),
			};
		});

		const config: AccessConfig = {
			mode: 'enforce',
			policyAud: 'test-aud',
			cfTeamDomain: 'test.cloudflareaccess.com',
		};
		const req = makeRequest({ 'cf-access-jwt-assertion': 'invalid-token' });
		const result = await validateAccess(req, config);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.status).toBe(403);
			// Must return generic message, not the raw jose error
			expect(result.error.message).toBe('Access denied');
		}

		vi.restoreAllMocks();
	});
});
