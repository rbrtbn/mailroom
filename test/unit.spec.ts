import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import worker from '../src';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('fetch handler', () => {
	it('returns 404 JSON for unknown routes', async () => {
		const request = new IncomingRequest('http://example.com/unknown');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
		const body: { ok: boolean; error: { type: string } } = await response.json();
		expect(body.ok).toBe(false);
		expect(body.error.type).toBe('http');
	});
});
