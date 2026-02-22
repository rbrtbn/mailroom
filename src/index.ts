import { type ResultAsync } from 'neverthrow';

import { createJmapClient, type JmapClient } from './jmap/client';
import { parseEnv, type ValidEnv } from './lib/env';
import type { ErrorResult } from './lib/errors';
import { isObject } from './type-utils';

// eslint-disable-next-line functional/no-let
let fmClientResult: ResultAsync<JmapClient, ErrorResult> | undefined;

const getFastmailClient = (env: ValidEnv) => {
	if (!fmClientResult) {
		fmClientResult = createJmapClient('https://api.fastmail.com', env.FASTMAIL_TOKEN);
	}
	return fmClientResult;
};

export default {
	fetch(req) {
		const { origin } = new URL(req.url);
		const url = origin + '/__scheduled?cron=*%2F2+*+*+*+*';

		return new Response(
			`To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl '${url}'".`,
		);
	},

	async scheduled(_event, env, _ctx): Promise<void> {
		await parseEnv(env)
			.andThen(getFastmailClient)
			.andThen((client) => client.queryEmails({ limit: 1 }))
			.match(
				(emails) => {
					console.log('State:', isObject(emails) && 'state' in emails ? emails.state : 'no state');
				},
				(error) => {
					console.error(error);
				},
			);
	},
} satisfies ExportedHandler<Env>;
