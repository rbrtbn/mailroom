import { type ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';

import { createJmapClient, type JmapClient } from './jmap/client';
import { parseEnv } from './lib/env';
import type { ErrorResult } from './lib/types';

// eslint-disable-next-line functional/no-let
let fmClientResult: ResultAsync<JmapClient, ErrorResult> | undefined;

const getFastmailClient = (env: ReadonlyDeep<Env>) => {
	if (!fmClientResult) {
		fmClientResult = parseEnv(env).andThen((env) =>
			createJmapClient('https://api.fastmail.com', env.FASTMAIL_TOKEN),
		);
	}
	return fmClientResult;
};

export default {
	fetch(req, _env, _ctx) {
		const { origin } = new URL(req.url);
		const url = origin + '/__scheduled?cron=*%2F2+*+*+*+*';

		return new Response(
			`To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl '${url}'".`,
		);
	},

	async scheduled(_event, env, _ctx) {
		await getFastmailClient(env)
			.andThen((client) => client.queryEmails({ limit: 1 }))
			.match(
				(emails) => {
					console.log('State:', emails.state);
				},
				(error) => {
					console.error(error);
				},
			);
	},
} satisfies ExportedHandler<Env>;
