import { emptyChain, type InvocationChain } from './chain';

// A computation that threads chain state and produces a value
export type ChainOp<A> = (chain: InvocationChain) => [InvocationChain, A];

// Sequence two operations, second receives the first's result
export const bind =
	<A, B>(op: ChainOp<A>, fn: (a: A) => ChainOp<B>): ChainOp<B> =>
	(chain) => {
		const [next, a] = op(chain);
		return fn(a)(next);
	};

// Sequence two operations, discarding the first result (when you don't need the callId).
// NOTE: Cannot name this "then" — ES modules with a `then` export are
// treated as thenables by `await import(...)`, causing an infinite hang.
export const seq = <A, B>(op1: ChainOp<A>, op2: ChainOp<B>): ChainOp<B> => bind(op1, () => op2);

// Run from empty chain, return just the chain
export const exec = <A>(op: ChainOp<A>): InvocationChain => op(emptyChain)[0];

// Lift a value without touching the chain
export const of =
	<A>(a: A): ChainOp<A> =>
	(chain) => [chain, a];
