import { err, ok, ResultAsync } from 'neverthrow';

import type { NetworkError, ValidationError } from './types';

export const safeFetch = (
	url: string,
	init?: Readonly<RequestInit>,
): ResultAsync<Response, NetworkError> =>
	ResultAsync.fromPromise(fetch(url, init), (error) => {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error('fetch:rejected', { url, message });
		return { type: 'network' as const, message };
	}).andThen((response) => {
		if (response.ok) return ok<Response, NetworkError>(response);
		return err<Response, NetworkError>({
			type: 'network',
			message: `HTTP ${String(response.status)} from ${url}`,
		});
	});

export const safeJson = (response: Readonly<Response>): ResultAsync<unknown, NetworkError> =>
	ResultAsync.fromPromise(response.json(), (error) => {
		const message = error instanceof Error ? error.message : 'unknown parse error';
		console.error('json:parse_failed', { status: response.status, message });
		return { type: 'network' as const, message: `Failed to parse JSON: ${message}` };
	});

export const safeJsonBody = (request: Readonly<Request>): ResultAsync<unknown, ValidationError> =>
	ResultAsync.fromPromise(request.json(), (error) => ({
		type: 'validation' as const,
		message: `Failed to parse request body: ${error instanceof Error ? error.message : 'invalid JSON'}`,
	}));
