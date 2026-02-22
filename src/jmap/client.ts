// fastmail.ts
import { Result, ResultAsync } from 'neverthrow';

import type { ErrorResult } from '~/lib/errors';
import { safeFetch, safeJson, safeParse } from '~/lib/zod-neverthrow';
import type { Immutable } from '~/type-utils';

import { type AccountId, AccountIdSchema, JmapResponseSchema, type JmapSession, JmapSessionSchema } from './schemas';

type Capability = 'urn:ietf:params:jmap:core' | 'urn:ietf:params:jmap:mail';
type MethodName = 'Mailbox/get' | 'Email/query' | 'Email/get';
type MethodArgs = Record<string, unknown>;
type CallId = string;
type Invocation = [MethodName, MethodArgs, CallId];

type CallFn = (
	using: ReadonlyArray<Capability>,
	methodCalls: ReadonlyArray<Invocation>,
) => ResultAsync<unknown[], ErrorResult>;

const discover = (host: string, token: string): ResultAsync<JmapSession, ErrorResult> =>
	safeFetch(`${host}/.well-known/jmap`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
		.andThen(safeJson)
		.andThen((data) => safeParse(JmapSessionSchema, data));

const makeCall =
	(session: JmapSession, token: string) =>
	(using: ReadonlyArray<Capability>, methodCalls: ReadonlyArray<Invocation>): ResultAsync<unknown[], ErrorResult> =>
		safeFetch(session.apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ using, methodCalls }),
		})
			.andThen(safeJson)
			.andThen((data) => safeParse(JmapResponseSchema, data))
			.map((res) => res.methodResponses.map(([, data]) => data));

const getAccountId = (session: JmapSession): Result<AccountId, ErrorResult> => safeParse(AccountIdSchema, session);

const getMailboxes = (session: JmapSession, call: CallFn): ResultAsync<unknown, ErrorResult> =>
	getAccountId(session).asyncAndThen((accountId) => {
		return call(
			['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
			[['Mailbox/get', { accountId, ids: null }, '0']],
		).map(([result]) => result);
	});

type QueryEmailsArgs = Immutable<{
	filter?: Immutable<Record<string, unknown>>;
	limit?: number;
	sort?: Immutable<{ property: string; isAscending: boolean }[]>;
}>;

const queryEmails = (
	session: JmapSession,
	call: CallFn,
	{ filter, limit, sort }: QueryEmailsArgs = {
		filter: {},
		limit: 50,
		sort: [{ property: 'receivedAt', isAscending: false }],
	},
): ResultAsync<unknown, ErrorResult> =>
	getAccountId(session).asyncAndThen((accountId) => {
		return call(
			['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
			[
				['Email/query', { accountId, filter, limit, sort }, '0'],
				[
					'Email/get',
					{
						accountId,
						'#ids': { resultOf: '0', name: 'Email/query', path: '/ids' },
						properties: ['subject', 'from', 'receivedAt', 'preview'],
					},
					'1',
				],
			],
		).map(([, emails]) => emails);
	});

export type JmapClient = {
	session: JmapSession;
	call: (
		using: ReadonlyArray<Capability>,
		methodCalls: ReadonlyArray<Invocation>,
	) => ResultAsync<unknown[], ErrorResult>;
	getMailboxes: () => ResultAsync<unknown, ErrorResult>;
	queryEmails: (args?: QueryEmailsArgs) => ResultAsync<unknown, ErrorResult>;
};

export const createJmapClient = (host: string, token: string): ResultAsync<JmapClient, ErrorResult> =>
	discover(host, token).map((session) => {
		const call = makeCall(session, token);

		return {
			session,
			call,
			getMailboxes: () => getMailboxes(session, call),
			queryEmails: (args?: QueryEmailsArgs) => queryEmails(session, call, args),
		};
	});
