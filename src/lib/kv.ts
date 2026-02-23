import { ResultAsync } from 'neverthrow';

import type { NetworkError } from './types';

export const safeKvGet = (kv: KVNamespace, key: string): ResultAsync<string | null, NetworkError> =>
	ResultAsync.fromPromise(kv.get(key), (error) => {
		console.error('kv:get_failed', {
			key,
			message: error instanceof Error ? error.message : 'unknown error',
		});
		return { type: 'network' as const, message: 'KV operation failed' };
	});

export const safeKvPut = (
	kv: KVNamespace,
	key: string,
	value: string,
): ResultAsync<void, NetworkError> =>
	ResultAsync.fromPromise(kv.put(key, value), (error) => {
		console.error('kv:put_failed', {
			key,
			message: error instanceof Error ? error.message : 'unknown error',
		});
		return { type: 'network' as const, message: 'KV operation failed' };
	});
