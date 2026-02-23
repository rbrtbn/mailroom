import { ResultAsync } from 'neverthrow';

import type { NetworkError } from './types';

export const safeKvGet = (kv: KVNamespace, key: string): ResultAsync<string | null, NetworkError> =>
	ResultAsync.fromPromise(kv.get(key), (error) => {
		const message = `KV get "${key}" failed: ${error instanceof Error ? error.message : 'unknown error'}`;
		console.error('kv:get_failed', { key, message });
		return { type: 'network' as const, message };
	});

export const safeKvPut = (
	kv: KVNamespace,
	key: string,
	value: string,
): ResultAsync<void, NetworkError> =>
	ResultAsync.fromPromise(kv.put(key, value), (error) => {
		const message = `KV put "${key}" failed: ${error instanceof Error ? error.message : 'unknown error'}`;
		console.error('kv:put_failed', { key, message });
		return { type: 'network' as const, message };
	});
