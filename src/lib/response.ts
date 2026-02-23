import { errAsync, type ResultAsync } from 'neverthrow';
import { match } from 'ts-pattern';
import type { ReadonlyDeep } from 'type-fest';

import type { ErrorResult, HandlerError, HttpError, HttpErrorStatus } from './types';

const json = (body: unknown, status: number) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const jsonOk = (data: unknown, status = 200) => json({ ok: true, data }, status);

export const jsonErr = (type: HandlerError['type'], message: string, status: number) =>
	json({ ok: false, error: { type, message } }, status);

export const jsonFromError = (error: ReadonlyDeep<ErrorResult>): Response =>
	match(error)
		.with({ type: 'network' }, (e) => jsonErr(e.type, e.message, 502))
		.with({ type: 'validation' }, (e) => jsonErr(e.type, e.message, 400))
		.with({ type: 'jmap' }, (e) => jsonErr(e.type, e.message, 500))
		.exhaustive();

export const jsonFromHandlerError = (error: ReadonlyDeep<HandlerError>): Response =>
	error.type === 'http' ? jsonErr('http', error.message, error.status) : jsonFromError(error);

export const httpErr = <T = never>(
	status: HttpErrorStatus,
	message: string,
): ResultAsync<T, HttpError> => errAsync({ type: 'http', status, message });
