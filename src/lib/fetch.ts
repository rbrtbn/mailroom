import { err, ok, Result, ResultAsync } from 'neverthrow';
import { z } from 'zod/v4';

import type { NetworkError, ValidationError } from './types';

export const safeFetch = (
	url: string,
	init?: Readonly<RequestInit>,
): ResultAsync<Response, NetworkError> =>
	ResultAsync.fromPromise(fetch(url, init), (error) => ({
		type: 'network',
		message: error instanceof Error ? error.message : 'Unknown error',
	}));

export const safeJson = (response: Readonly<Response>): ResultAsync<unknown, NetworkError> =>
	ResultAsync.fromPromise(response.json(), () => ({
		type: 'network',
		message: 'Failed to parse JSON',
	}));

export const safeParse = <T>(schema: z.ZodType<T>, data: unknown): Result<T, ValidationError> => {
	const result = schema.safeParse(data);
	return result.success
		? ok(result.data)
		: err({
				type: 'validation',
				message: result.error.issues.map((i) => i.message).join('; '),
			});
};
