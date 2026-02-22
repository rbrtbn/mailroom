import { errAsync, type ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';

import type { ErrorResult, HandlerError, HttpError } from './types';

const json = (body: unknown, status: number) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const jsonOk = (data: unknown, status = 200) => json({ ok: true, data }, status);

export const jsonErr = (type: string, message: string, status: number) =>
	json({ ok: false, error: { type, message } }, status);

export const jsonFromError = (error: ReadonlyDeep<ErrorResult>): Response => {
	const status = error.type === 'network' ? 502 : error.type === 'validation' ? 400 : 500;
	return jsonErr(error.type, error.message, status);
};

export const jsonFromHandlerError = (error: ReadonlyDeep<HandlerError>): Response =>
	error.type === 'http' ? jsonErr('http', error.message, error.status) : jsonFromError(error);

export const httpErr = <T = never>(status: number, message: string): ResultAsync<T, HttpError> =>
	errAsync({ type: 'http', status, message });
