import { type ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';
import { z } from 'zod/v4';

import { createJmapClient, type JmapClient } from './jmap/client';
import { safeParse } from './lib/fetch';
import type { ErrorResult } from './lib/types';

// eslint-disable-next-line functional/no-let
let fmClientResult: ResultAsync<JmapClient, ErrorResult> | undefined;

const EnvSchema = z.object({
	FASTMAIL_TOKEN: z.string().nonempty(),
	DEEPL_API_KEY: z.string().nonempty().optional(),
	RESEND_API_KEY: z.string().nonempty(),
	PUSHOVER_USER_KEY: z.string().nonempty().optional(),
	PUSHOVER_APP_TOKEN: z.string().nonempty().optional(),
});

const getFastmailClient = (env: ReadonlyDeep<Env>) => {
	if (!fmClientResult) {
		fmClientResult = safeParse(EnvSchema, env).asyncAndThen((env) =>
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
					console.log(
						'State:',
						typeof emails === 'object' && emails !== null && 'state' in emails
							? emails.state
							: 'no state',
					);
				},
				(error) => {
					console.error(error);
				},
			);
	},
} satisfies ExportedHandler<Env>;
