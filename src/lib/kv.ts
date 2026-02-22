import { ResultAsync } from 'neverthrow';

import type { NetworkError } from './types';

export const safeKvGet = (kv: KVNamespace, key: string): ResultAsync<string | null, NetworkError> =>
	ResultAsync.fromPromise(kv.get(key), (error) => ({
		type: 'network',
		message: error instanceof Error ? error.message : 'KV get failed',
	}));

export const safeKvPut = (
	kv: KVNamespace,
	key: string,
	value: string,
): ResultAsync<void, NetworkError> =>
	ResultAsync.fromPromise(kv.put(key, value), (error) => ({
		type: 'network',
		message: error instanceof Error ? error.message : 'KV put failed',
	}));
