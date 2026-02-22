import { type ResultAsync } from 'neverthrow';

import { safeFetch, safeJson, safeParse } from '~/lib/fetch';
import type { ErrorResult } from '~/lib/types';

import type { QueryEmailsArgs } from './chain';
import type { JmapRequest } from './operations';
import { execute, getMailboxes, queryEmails } from './operations';
import { JmapResponseSchema, type JmapSession, JmapSessionSchema } from './schemas';

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
	(jmapRequest: JmapRequest): ResultAsync<unknown[], ErrorResult> =>
		safeFetch(session.apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(jmapRequest),
		})
			.andThen(safeJson)
			.andThen((data) => safeParse(JmapResponseSchema, data))
			.map((res) => res.methodResponses.map(([, data]) => data));

export type JmapClient = {
	session: JmapSession;
	call: (jmapRequest: JmapRequest) => ResultAsync<unknown[], ErrorResult>;
	getMailboxes: () => ResultAsync<unknown, ErrorResult>;
	queryEmails: (args?: QueryEmailsArgs) => ResultAsync<unknown, ErrorResult>;
};

export const createJmapClient = (
	host: string,
	token: string,
): ResultAsync<JmapClient, ErrorResult> =>
	discover(host, token).map((session) => {
		const call = makeCall(session, token);

		return {
			session,
			call,
			getMailboxes: () => execute(session, call, getMailboxes),
			queryEmails: (args?: QueryEmailsArgs) => execute(session, call, queryEmails(args)),
		};
	});
