import { type Result, type ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';

import { safeParse } from '~/lib/fetch';
import type { ErrorResult } from '~/lib/types';

import {
	type Capability,
	emailQueryRef,
	emptyChain,
	type Invocation,
	type InvocationChain,
	type QueryEmailsArgs,
	withEmailGet,
	withEmailGetByIds,
	withEmailQuery,
	withMailboxGet,
} from './chain';
import {
	type AccountId,
	AccountIdSchema,
	type EmailGetResponse,
	EmailGetResponseSchema,
	type JmapSession,
	type MailboxGetResponse,
	MailboxGetResponseSchema,
} from './schemas';
import { bind, exec } from './state';

// ── The core abstraction ───────────────────────────────────────────
// A JmapOperation is pure data: how to build the chain, and how to
// interpret the response. No I/O, no session, no fetch.

type JmapOperation<T> = {
	readonly capabilities: readonly Capability[];
	readonly buildChain: (accountId: AccountId) => InvocationChain;
	readonly parseResponse: (responses: readonly unknown[]) => Result<T, ErrorResult>;
};

const MAIL_CAPS = ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'] as const;

// ── Operation definitions ──────────────────────────────────────────

export const getMailboxes: JmapOperation<MailboxGetResponse> = {
	capabilities: MAIL_CAPS,
	buildChain: (accountId) => {
		const [chain] = withMailboxGet(emptyChain, { accountId, ids: null });
		return chain;
	},
	parseResponse: ([mailboxes]) => safeParse(MailboxGetResponseSchema, mailboxes),
};

export const queryEmails = (args?: QueryEmailsArgs): JmapOperation<EmailGetResponse> => ({
	capabilities: MAIL_CAPS,
	buildChain: (accountId) => {
		const [c1, queryId] = withEmailQuery(emptyChain, { accountId, ...args });
		const [c2] = withEmailGet(c1, {
			accountId,
			'#ids': emailQueryRef(queryId, '/ids'),
			properties: ['subject', 'from', 'receivedAt', 'preview'],
		});
		return c2;
	},
	parseResponse: ([, emails]) => safeParse(EmailGetResponseSchema, emails),
});

export const queryEmailsMonadic = (args?: QueryEmailsArgs): JmapOperation<EmailGetResponse> => ({
	capabilities: MAIL_CAPS,
	buildChain: (accountId) =>
		exec(
			bind(
				(chain) => withEmailQuery(chain, { accountId, ...args }),
				(queryId) => (chain) =>
					withEmailGet(chain, {
						accountId,
						'#ids': emailQueryRef(queryId, '/ids'),
						properties: ['subject', 'from', 'receivedAt', 'preview'],
					}),
			),
		),
	parseResponse: ([, emails]) => safeParse(EmailGetResponseSchema, emails),
});

export const getEmailsByIds = (ids: readonly string[]): JmapOperation<EmailGetResponse> => ({
	capabilities: MAIL_CAPS,
	buildChain: (accountId) => {
		const [chain] = withEmailGetByIds(emptyChain, {
			accountId,
			ids: [...ids],
			properties: ['subject', 'from', 'receivedAt', 'preview'],
		});
		return chain;
	},
	parseResponse: ([emails]) => safeParse(EmailGetResponseSchema, emails),
});

// ── Executor: the only part that touches I/O ───────────────────────

export type JmapRequest = ReadonlyDeep<{
	using: Capability[];
	methodCalls: Invocation[];
}>;

export type CallFn = (request: JmapRequest) => ResultAsync<readonly unknown[], ErrorResult>;

export const toRequest = <T>(
	session: JmapSession,
	op: JmapOperation<T>,
): Result<JmapRequest, ErrorResult> =>
	safeParse(AccountIdSchema, session).map((accountId) => ({
		using: op.capabilities,
		methodCalls: op.buildChain(accountId).invocations,
	}));

export const execute = <T>(
	session: JmapSession,
	call: CallFn,
	op: JmapOperation<T>,
): ResultAsync<T, ErrorResult> =>
	toRequest(session, op)
		.asyncAndThen(call)
		.andThen((responses) => op.parseResponse(responses));
