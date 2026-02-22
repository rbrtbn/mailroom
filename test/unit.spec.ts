import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

// Import your worker so you can unit test it
import worker from '../src';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Hello World worker', () => {
	it('responds with Hello World!', async () => {
		const request = new IncomingRequest('http://example.com/health');
		// Create an empty context to pass to `worker.fetch()`
		const ctx = createExecutionContext();
		const response = worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.text()).toContain('__scheduled?cron=*%2F2+*+*+*+*');
	});
});
