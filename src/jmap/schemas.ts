import { z } from 'zod/v4';

import type { InferImmutable } from '~/type-utils';

const JmapAccountSchema = z.object({
	name: z.string(),
	isPersonal: z.boolean(),
	accountCapabilities: z.record(z.string(), z.unknown()),
});

export const JmapSessionSchema = z.object({
	apiUrl: z.url(),
	downloadUrl: z.string(),
	uploadUrl: z.string(),
	eventSourceUrl: z.string(),
	state: z.string(),
	primaryAccounts: z.record(z.string(), z.string()),
	accounts: z.record(z.string(), JmapAccountSchema),
	capabilities: z.record(z.string(), z.unknown()),
});

export type JmapSession = InferImmutable<typeof JmapSessionSchema>;

export const AccountIdSchema = z
	.object({
		primaryAccounts: z.object({
			'urn:ietf:params:jmap:mail': z.string(),
		}),
	})
	.transform((data) => data.primaryAccounts['urn:ietf:params:jmap:mail']);

export type AccountId = InferImmutable<typeof AccountIdSchema>;

const MethodResponseSchema = z.tuple([
	z.string(), // method name
	z.unknown(), // response data
	z.string(), // call id
]);

export const JmapResponseSchema = z.object({
	methodResponses: z.array(MethodResponseSchema),
	sessionState: z.string(),
});
