import type { ReadonlyDeep } from 'type-fest';

import type { AccountId } from './schemas';

// ── Types ──────────────────────────────────────────────────────────

export type Capability = 'urn:ietf:params:jmap:core' | 'urn:ietf:params:jmap:mail';
export type MethodName = 'Mailbox/get' | 'Email/query' | 'Email/get' | 'Email/set';
export type MethodArgs = ReadonlyDeep<Record<string, unknown>>;
export type CallId = string;
export type Invocation = ReadonlyDeep<[MethodName, MethodArgs, CallId]>;

export type ResultReference = ReadonlyDeep<{
	readonly resultOf: CallId;
	readonly name: MethodName;
	readonly path: string;
}>;

// ── Immutable chain state ──────────────────────────────────────────

export type InvocationChain = ReadonlyDeep<{
	invocations: Invocation[];
}>;

export const emptyChain: InvocationChain = { invocations: [] };

// ── Internal helpers ───────────────────────────────────────────────

const nextCallId = (chain: InvocationChain): CallId => String(chain.invocations.length);

const append = (chain: InvocationChain, invocation: Invocation): InvocationChain => ({
	invocations: [...chain.invocations, invocation],
});

// ── Branded CallIds ────────────────────────────────────────────────
// Phantom brand lets us tie a callId to the method that produced it,
// so ref helpers can enforce which callIds are valid inputs.

type BrandedCallId<M extends MethodName> = CallId & { readonly _method: M };

// ── Method-specific chain steps ────────────────────────────────────
// Each returns [newChain, brandedCallId] — the State monad pattern.

export type WithAccountId<TArgs extends MethodArgs> = {
	readonly accountId: AccountId;
} & TArgs;

export type MailboxGetArgs = ReadonlyDeep<{
	ids: null;
}>;

export const withMailboxGet = (
	chain: InvocationChain,
	args: WithAccountId<MailboxGetArgs>,
): [InvocationChain, BrandedCallId<'Mailbox/get'>] => {
	const callId = nextCallId(chain) as BrandedCallId<'Mailbox/get'>;
	return [append(chain, ['Mailbox/get', args, callId]), callId];
};

export type QueryEmailsArgs = ReadonlyDeep<{
	filter?: Record<string, unknown>;
	limit?: number;
	sort?: { property: string; isAscending: boolean }[];
}>;

export const withEmailQuery = (
	chain: InvocationChain,
	args: WithAccountId<QueryEmailsArgs>,
): [InvocationChain, BrandedCallId<'Email/query'>] => {
	const callId = nextCallId(chain) as BrandedCallId<'Email/query'>;
	return [append(chain, ['Email/query', args, callId]), callId];
};

export type EmailGetArgs = ReadonlyDeep<{
	'#ids': ResultReference;
	properties: string[];
}>;

export const withEmailGet = (
	chain: InvocationChain,
	args: WithAccountId<EmailGetArgs>,
): [InvocationChain, BrandedCallId<'Email/get'>] => {
	const callId = nextCallId(chain) as BrandedCallId<'Email/get'>;
	return [append(chain, ['Email/get', args, callId]), callId];
};

export type EmailGetByIdsArgs = ReadonlyDeep<{
	ids: string[];
	properties: string[];
}>;

export const withEmailGetByIds = (
	chain: InvocationChain,
	args: WithAccountId<EmailGetByIdsArgs>,
): [InvocationChain, BrandedCallId<'Email/get'>] => {
	const callId = nextCallId(chain) as BrandedCallId<'Email/get'>;
	return [append(chain, ['Email/get', args, callId]), callId];
};

export type EmailSetArgs = ReadonlyDeep<{
	update?: Record<string, Record<string, unknown>>;
}>;

export const withEmailSet = (
	chain: InvocationChain,
	args: WithAccountId<EmailSetArgs>,
): [InvocationChain, BrandedCallId<'Email/set'>] => {
	const callId = nextCallId(chain) as BrandedCallId<'Email/set'>;
	return [append(chain, ['Email/set', args, callId]), callId];
};

// ── Type-safe result references ────────────────────────────────────
// The callId brand constrains which method names are valid.
// Path is already narrowed per-method via string literal unions.

export const emailQueryRef = (
	callId: BrandedCallId<'Email/query'>,
	path: '/ids' | '/position' | '/queryState',
): ResultReference => ({
	resultOf: callId,
	name: 'Email/query',
	path,
});

export const mailboxGetRef = (
	callId: BrandedCallId<'Mailbox/get'>,
	path: '/list' | '/list/*/id' | '/notFound',
): ResultReference => ({
	resultOf: callId,
	name: 'Mailbox/get',
	path,
});
