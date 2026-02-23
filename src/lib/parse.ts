import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod/v4';

import type { ValidationError } from './types';

export const safeParse = <T>(schema: z.ZodType<T>, data: unknown): Result<T, ValidationError> => {
	const result = schema.safeParse(data);
	return result.success
		? ok(result.data)
		: err({
				type: 'validation',
				message: result.error.issues.map((i) => i.message).join('; '),
			});
};
