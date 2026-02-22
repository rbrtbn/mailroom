import type z from 'zod';

/** Recursively marks all properties as readonly */
type DeepReadonly<T> =
	T extends ReadonlyMap<infer K, infer V>
		? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
		: T extends ReadonlySet<infer V>
			? ReadonlySet<DeepReadonly<V>>
			: T extends readonly (infer V)[]
				? readonly DeepReadonly<V>[]
				: T extends object
					? { readonly [K in keyof T]: DeepReadonly<T[K]> }
					: T;

/** Shorthand alias */
export type Immutable<T> = DeepReadonly<T>;

/** Infer the type of a zod schema and mark it as immutable */
export type InferImmutable<T extends z.ZodType> = DeepReadonly<z.infer<T>>;

export const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
