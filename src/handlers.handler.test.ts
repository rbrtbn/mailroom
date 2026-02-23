import { errAsync, okAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';
import { describe, expect, it } from 'vitest';

import { handleEnrich, handleInit, handleUnenriched } from './handlers';
import type { JmapClient } from './jmap/client';
import type { EmailGetResponse } from './jmap/schemas';
import type { ErrorResult } from './lib/types';

// ── Mock helpers ─────────────────────────────────────────────────────

const mockKv = (initial: Readonly<Record<string, string>> = {}): KVNamespace => {
	const store = new Map(Object.entries(initial));
	return {
		get: (key: string) => Promise.resolve(store.get(key) ?? null),
		put: (key: string, value: string) => {
			// eslint-disable-next-line functional/immutable-data
			store.set(key, value);
			return Promise.resolve();
		},
	} as unknown as KVNamespace;
};

const mockFailingKv = (): KVNamespace =>
	({
		get: () => Promise.resolve(null),
		put: () => Promise.reject(new Error('KV write failed')),
	}) as unknown as KVNamespace;

const mockEmailResponse = (
	emails: ReadonlyDeep<EmailGetResponse['list']> = [],
	state = 'state-1',
): ReadonlyDeep<EmailGetResponse> => ({
	accountId: 'acc-1',
	state,
	list: emails,
	notFound: [],
});

const mockClient = (
	overrides: Readonly<
		Partial<{
			queryEmails: JmapClient['queryEmails'];
			getEmailsByIds: JmapClient['getEmailsByIds'];
		}>
	> = {},
): ReadonlyDeep<JmapClient> =>
	({
		queryEmails: () => okAsync(mockEmailResponse()),
		getEmailsByIds: () => okAsync(mockEmailResponse()),
		...overrides,
	}) as unknown as ReadonlyDeep<JmapClient>;

const mockEnv = (kv: KVNamespace = mockKv()): ReadonlyDeep<Env> =>
	({
		STATE_KV: kv,
		FASTMAIL_TOKEN: 'test-token',
		RESEND_API_KEY: 'test-resend',
	}) as unknown as ReadonlyDeep<Env>;

const makeRequest = (url: string, init?: Readonly<RequestInit>) => new Request(url, init);

// ── handleInit ───────────────────────────────────────────────────────

describe('handleInit', () => {
	it('returns HttpError 409 when KV already has state', async () => {
		const kv = mockKv({ 'email:sinceState': 'existing-state' });
		const result = await handleInit(makeRequest('https://x/init'), mockEnv(kv), mockClient());

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('http');
			if (result.error.type === 'http') {
				expect(result.error.status).toBe(409);
			}
		}
	});

	it('returns HttpError 404 when email list is empty', async () => {
		const client = mockClient({
			queryEmails: () => okAsync(mockEmailResponse([])),
		});
		const result = await handleInit(makeRequest('https://x/init'), mockEnv(), client);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('http');
			if (result.error.type === 'http') {
				expect(result.error.status).toBe(404);
			}
		}
	});

	it('returns Ok with email and state on success', async () => {
		const kv = mockKv();
		const emails: ReadonlyDeep<EmailGetResponse['list']> = [
			{
				id: 'e-1',
				subject: 'Test',
				from: [{ name: 'Alice', email: 'alice@example.com' }],
				receivedAt: '2025-01-01T00:00:00Z',
				preview: 'Hello',
			},
		];
		const client = mockClient({
			queryEmails: () => okAsync(mockEmailResponse(emails, 'new-state')),
		});

		const result = await handleInit(makeRequest('https://x/init'), mockEnv(kv), client);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const data = result.value as Record<string, unknown>;
			expect(data['state']).toBe('new-state');
		}

		const storedState = await kv.get('email:sinceState');
		expect(storedState).toBe('new-state');
	});

	it('returns network error when KV put fails', async () => {
		const kv = mockFailingKv();
		const emails: ReadonlyDeep<EmailGetResponse['list']> = [
			{
				id: 'e-1',
				subject: 'Test',
				from: null,
				receivedAt: '2025-01-01T00:00:00Z',
				preview: 'Hello',
			},
		];
		const client = mockClient({
			queryEmails: () => okAsync(mockEmailResponse(emails)),
		});

		const result = await handleInit(makeRequest('https://x/init'), mockEnv(kv), client);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('network');
		}
	});

	it('returns jmap error when queryEmails fails', async () => {
		const client = mockClient({
			queryEmails: () =>
				errAsync({
					type: 'jmap',
					method: 'Email/query',
					message: 'Server error',
				} satisfies ErrorResult),
		});

		const result = await handleInit(makeRequest('https://x/init'), mockEnv(), client);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('jmap');
		}
	});

	it('returns network error when KV get fails', async () => {
		const kv = {
			get: () => Promise.reject(new Error('KV read failed')),
			put: () => Promise.resolve(),
		} as unknown as KVNamespace;

		const result = await handleInit(makeRequest('https://x/init'), mockEnv(kv), mockClient());

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('network');
		}
	});
});

// ── handleUnenriched ─────────────────────────────────────────────────

describe('handleUnenriched', () => {
	it('returns validation error for invalid limit', async () => {
		const result = await handleUnenriched(
			makeRequest('https://x/emails/unenriched?limit=0'),
			mockEnv(),
			mockClient(),
		);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('validation');
		}
	});

	it('returns Ok with emails on success', async () => {
		const emails: ReadonlyDeep<EmailGetResponse['list']> = [
			{
				id: 'e-1',
				subject: 'Test',
				from: [{ name: 'Bob', email: 'bob@test.com' }],
				receivedAt: '2025-01-01T00:00:00Z',
				preview: 'Preview',
			},
		];
		const client = mockClient({
			queryEmails: () => okAsync(mockEmailResponse(emails)),
		});

		const result = await handleUnenriched(
			makeRequest('https://x/emails/unenriched?limit=10&from=bob'),
			mockEnv(),
			client,
		);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const data = result.value as Record<string, unknown>;
			expect(data['emails']).toBeDefined();
		}
	});

	it('returns validation error for invalid datetime in before param', async () => {
		const result = await handleUnenriched(
			makeRequest('https://x/emails/unenriched?before=not-a-date'),
			mockEnv(),
			mockClient(),
		);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('validation');
		}
	});

	it('accepts valid ISO datetime in before/after params', async () => {
		const result = await handleUnenriched(
			makeRequest(
				'https://x/emails/unenriched?before=2025-01-01T00:00:00Z&after=2024-12-01T00:00:00Z',
			),
			mockEnv(),
			mockClient(),
		);

		expect(result.isOk()).toBe(true);
	});

	it('returns network error when queryEmails fails', async () => {
		const client = mockClient({
			queryEmails: () =>
				errAsync({
					type: 'network',
					message: 'Connection refused',
				} satisfies ErrorResult),
		});

		const result = await handleUnenriched(
			makeRequest('https://x/emails/unenriched'),
			mockEnv(),
			client,
		);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('network');
		}
	});
});

// ── handleEnrich ─────────────────────────────────────────────────────

describe('handleEnrich', () => {
	it('returns validation error for empty ids array', async () => {
		const result = await handleEnrich(
			makeRequest('https://x/emails/enrich', {
				method: 'POST',
				body: JSON.stringify({ ids: [] }),
				headers: { 'Content-Type': 'application/json' },
			}),
			mockEnv(),
			mockClient(),
		);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('validation');
		}
	});

	it('returns validation error for malformed JSON body', async () => {
		const result = await handleEnrich(
			makeRequest('https://x/emails/enrich', {
				method: 'POST',
				body: 'not json',
				headers: { 'Content-Type': 'application/json' },
			}),
			mockEnv(),
			mockClient(),
		);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('validation');
		}
	});

	it('returns Ok with grouped domains on success', async () => {
		const emails: ReadonlyDeep<EmailGetResponse['list']> = [
			{
				id: 'e-1',
				subject: 'PR merged',
				from: [{ name: null, email: 'noreply@github.com' }],
				receivedAt: '2025-01-01T00:00:00Z',
				preview: 'Your PR was merged',
			},
			{
				id: 'e-2',
				subject: 'New issue',
				from: [{ name: null, email: 'notifications@github.com' }],
				receivedAt: '2025-01-02T00:00:00Z',
				preview: 'New issue opened',
			},
		];
		const client = mockClient({
			getEmailsByIds: () => okAsync(mockEmailResponse(emails)),
		});

		const result = await handleEnrich(
			makeRequest('https://x/emails/enrich', {
				method: 'POST',
				body: JSON.stringify({ ids: ['e-1', 'e-2'] }),
				headers: { 'Content-Type': 'application/json' },
			}),
			mockEnv(),
			client,
		);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const data = result.value as Record<string, unknown>;
			expect(data['totalEmails']).toBe(2);
			expect(data['totalDomains']).toBe(1);
		}
	});

	it('returns jmap error when JMAP client fails', async () => {
		const client = mockClient({
			getEmailsByIds: () =>
				errAsync({
					type: 'jmap',
					method: 'Email/get',
					message: 'Server error',
				} satisfies ErrorResult),
		});

		const result = await handleEnrich(
			makeRequest('https://x/emails/enrich', {
				method: 'POST',
				body: JSON.stringify({ ids: ['e-1'] }),
				headers: { 'Content-Type': 'application/json' },
			}),
			mockEnv(),
			client,
		);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('jmap');
		}
	});
});
