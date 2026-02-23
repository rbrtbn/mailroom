import { type ResultAsync } from 'neverthrow';

import { safeFetch, safeJson } from '~/lib/fetch';
import { safeParse } from '~/lib/parse';
import type { ErrorResult } from '~/lib/types';

import type { QueryEmailsArgs } from './chain';
import type { JmapRequest } from './operations';
import { execute, getEmailsByIds, getMailboxes, queryEmails } from './operations';
import {
	type EmailGetResponse,
	JmapResponseSchema,
	type JmapSession,
	JmapSessionSchema,
	type MailboxGetResponse,
} from './schemas';

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
	getMailboxes: () => ResultAsync<MailboxGetResponse, ErrorResult>;
	queryEmails: (args?: QueryEmailsArgs) => ResultAsync<EmailGetResponse, ErrorResult>;
	getEmailsByIds: (ids: readonly string[]) => ResultAsync<EmailGetResponse, ErrorResult>;
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
			getEmailsByIds: (ids: readonly string[]) => execute(session, call, getEmailsByIds(ids)),
		};
	});
