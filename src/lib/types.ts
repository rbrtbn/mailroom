/**
 * Core error types (discriminated union on `type`) and shared type aliases
 * for Result-based error handling, HTTP handlers, and Cloudflare Access auth.
 */
import type { ResultAsync } from 'neverthrow';
import type { ReadonlyDeep } from 'type-fest';

import type { JmapClient } from '~/jmap/client';

export type NetworkError = Readonly<{ type: 'network'; message: string }>;
export type ValidationError = Readonly<{ type: 'validation'; message: string }>;
export type JmapError = Readonly<{ type: 'jmap'; method: string; message: string }>;
export type ErrorResult = NetworkError | ValidationError | JmapError;

export type HttpErrorStatus = 400 | 401 | 403 | 404 | 405 | 409 | 500 | 502;
export type HttpError = Readonly<{ type: 'http'; status: HttpErrorStatus; message: string }>;
export type HandlerError = ErrorResult | HttpError;

export type Handler = (
	req: Readonly<Request>,
	env: ReadonlyDeep<Env>,
	client: ReadonlyDeep<JmapClient>,
) => ResultAsync<unknown, HandlerError>;

export type AccessConfig =
	| Readonly<{ mode: 'bypass' }>
	| Readonly<{ mode: 'enforce'; policyAud: string; cfTeamDomain: string }>;
