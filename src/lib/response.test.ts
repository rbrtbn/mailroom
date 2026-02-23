import { describe, expect, it } from 'vitest';

import { httpErr, jsonFromError, jsonFromHandlerError, jsonOk, mkHttpError } from './response';

const parseBody = async (response: Readonly<Response>): Promise<Record<string, unknown>> =>
	response.json();

describe('jsonOk', () => {
	it('returns 200 with ok: true envelope', async () => {
		const response = jsonOk({ hello: 'world' });
		expect(response.status).toBe(200);
		const body = await parseBody(response);
		expect(body['ok']).toBe(true);
		expect(body['data']).toEqual({ hello: 'world' });
	});

	it('accepts custom status code', () => {
		const response = jsonOk('created', 201);
		expect(response.status).toBe(201);
	});
});

describe('jsonFromError', () => {
	it('maps network error to 502', async () => {
		const response = jsonFromError({ type: 'network', message: 'timeout' });
		expect(response.status).toBe(502);
		const body = await parseBody(response);
		expect(body['ok']).toBe(false);
	});

	it('maps validation error to 400', () => {
		const response = jsonFromError({ type: 'validation', message: 'bad input' });
		expect(response.status).toBe(400);
	});

	it('maps jmap error to 500', () => {
		const response = jsonFromError({ type: 'jmap', method: 'Email/get', message: 'fail' });
		expect(response.status).toBe(500);
	});
});

describe('jsonFromHandlerError', () => {
	it('passes HttpError status through', async () => {
		const response = jsonFromHandlerError({ type: 'http', status: 409, message: 'Conflict' });
		expect(response.status).toBe(409);
		const body = await parseBody(response);
		expect(body['ok']).toBe(false);
		const error = body['error'] as Record<string, unknown>;
		expect(error['type']).toBe('http');
		expect(error['message']).toBe('Conflict');
	});

	it('delegates ErrorResult to jsonFromError', () => {
		const response = jsonFromHandlerError({ type: 'network', message: 'down' });
		expect(response.status).toBe(502);
	});
});

describe('mkHttpError', () => {
	it('creates correct HttpError object', () => {
		const error = mkHttpError(404, 'Not found');
		expect(error).toEqual({ type: 'http', status: 404, message: 'Not found' });
	});
});

describe('httpErr', () => {
	it('creates ResultAsync with HttpError', async () => {
		const result = await httpErr(403, 'Forbidden');
		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.type).toBe('http');
			expect(result.error.status).toBe(403);
			expect(result.error.message).toBe('Forbidden');
		}
	});
});
