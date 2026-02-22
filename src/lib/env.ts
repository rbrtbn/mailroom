import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';
import { z } from 'zod/v4';

import type { ErrorResult } from '~/lib/types';

export const EnvSchema = z.object({
	FASTMAIL_TOKEN: z.string().nonempty(),
	DEEPL_API_KEY: z.string().nonempty().optional(),
	RESEND_API_KEY: z.string().nonempty(),
	PUSHOVER_USER_KEY: z.string().nonempty().optional(),
	PUSHOVER_APP_TOKEN: z.string().nonempty().optional(),
});

export type ValidEnv = ReadonlyDeep<z.infer<typeof EnvSchema>>;

export const parseEnv = (env: unknown): ResultAsync<ValidEnv, ErrorResult> => {
	const result = EnvSchema.safeParse(env);
	return result.success
		? okAsync(result.data)
		: errAsync({
				type: 'validation',
				message: `Missing env: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}`,
			});
};
