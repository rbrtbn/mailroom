import { describe, expect, it } from 'vitest';

import { getEmailsByIds, getMailboxes, queryEmails, toRequest } from './operations';
import type { AccountId, JmapSession } from './schemas';

// ── Layer 1: Chain building (pure, no mocks needed) ────────────────

describe('queryEmails.buildChain', () => {
	it('produces Email/query then Email/get with back-reference', () => {
		const chain = queryEmails({ limit: 5 }).buildChain('acc-123' as AccountId);

		expect(chain.invocations).toHaveLength(2);
		expect(chain.invocations[0]?.[0]).toBe('Email/query');
		expect(chain.invocations[0]?.[1]).toMatchObject({ limit: 5 });
		expect(chain.invocations[1]?.[0]).toBe('Email/get');

		const getArgs = chain.invocations[1]?.[1] as Record<string, unknown> | undefined;
		expect(getArgs?.['#ids']).toEqual({
			resultOf: '0',
			name: 'Email/query',
			path: '/ids',
		});
	});
});

// ── Layer 2: Response parsing (pure, no mocks needed) ──────────────

describe('queryEmails.parseResponse', () => {
	it('parses valid response from second invocation', () => {
		const raw = [
			{ accountId: 'x', queryState: 's', ids: ['1'], position: 0 },
			{
				accountId: 'x',
				state: 's',
				list: [
					{
						id: '1',
						subject: 'hi',
						from: null,
						receivedAt: '2025-01-01T00:00:00Z',
						preview: 'hey',
					},
				],
				notFound: [],
			},
		];
		const result = queryEmails().parseResponse(raw);
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().list[0]?.subject).toBe('hi');
	});

	it('rejects malformed response', () => {
		const result = queryEmails().parseResponse([null, { garbage: true }]);
		expect(result.isErr()).toBe(true);
	});
});

// ── getEmailsByIds (layers 1+2) ─────────────────────────────────────

describe('getEmailsByIds.buildChain', () => {
	it('produces a single Email/get with direct ids', () => {
		const chain = getEmailsByIds(['id-1', 'id-2']).buildChain('acc-123' as AccountId);

		expect(chain.invocations).toHaveLength(1);
		expect(chain.invocations[0]?.[0]).toBe('Email/get');

		const args = chain.invocations[0]?.[1] as Record<string, unknown> | undefined;
		expect(args?.['ids']).toEqual(['id-1', 'id-2']);
		expect(args?.['properties']).toEqual(['subject', 'from', 'receivedAt', 'preview']);
		expect(args?.['#ids']).toBeUndefined();
	});
});

describe('getEmailsByIds.parseResponse', () => {
	it('parses valid response from index 0', () => {
		const raw = [
			{
				accountId: 'x',
				state: 's',
				list: [
					{
						id: '1',
						subject: 'hi',
						from: [{ name: 'Alice', email: 'alice@example.com' }],
						receivedAt: '2025-01-01T00:00:00Z',
						preview: 'hey',
					},
				],
				notFound: ['id-missing'],
			},
		];
		const result = getEmailsByIds(['1', 'id-missing']).parseResponse(raw);
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().list[0]?.subject).toBe('hi');
		expect(result._unsafeUnwrap().notFound).toEqual(['id-missing']);
	});

	it('rejects malformed response', () => {
		const result = getEmailsByIds(['1']).parseResponse([{ garbage: true }]);
		expect(result.isErr()).toBe(true);
	});
});

// ── Layer 3: Request building (pure, tests toRequest) ──────────────

const fakeSession: JmapSession = {
	apiUrl: 'https://jmap.example.com/api/',
	downloadUrl: 'https://jmap.example.com/download/',
	uploadUrl: 'https://jmap.example.com/upload/',
	eventSourceUrl: 'https://jmap.example.com/events/',
	state: 's1',
	primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acc-1' },
	accounts: { 'acc-1': { name: 'Test', isPersonal: true, accountCapabilities: {} } },
	capabilities: {},
};

describe('toRequest', () => {
	it('builds a full JmapRequest from session + operation', () => {
		const result = toRequest(fakeSession, getMailboxes);

		expect(result.isOk()).toBe(true);
		const req = result._unsafeUnwrap();
		expect(req.using).toContain('urn:ietf:params:jmap:mail');
		expect(req.methodCalls[0]?.[0]).toBe('Mailbox/get');
	});
});
