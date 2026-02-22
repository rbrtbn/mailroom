import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import z from 'zod';

import type { ErrorResult } from '~/lib/errors';
import type { Immutable, InferImmutable } from '~/type-utils';

const EnvSchema = z.object({
	FASTMAIL_TOKEN: z.string().nonempty(),
	DEEPL_API_KEY: z.string().nonempty().optional(),
	RESEND_API_KEY: z.string().nonempty(),
	PUSHOVER_USER_KEY: z.string().nonempty().optional(),
	PUSHOVER_APP_TOKEN: z.string().nonempty().optional(),
});

export type ValidEnv = InferImmutable<typeof EnvSchema>;

export const parseEnv = (env: Immutable<Env>): ResultAsync<ValidEnv, ErrorResult> => {
	const result = EnvSchema.safeParse(env);
	return result.success
		? okAsync(result.data)
		: errAsync({
				type: 'validation',
				message: `Missing env: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}`,
			});
};
