import type { ReadonlyDeep } from 'type-fest';
import { z } from 'zod/v4';

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

export type JmapSession = ReadonlyDeep<z.infer<typeof JmapSessionSchema>>;

export const AccountIdSchema = z
	.object({
		primaryAccounts: z.object({
			'urn:ietf:params:jmap:mail': z.string(),
		}),
	})
	.transform((data) => data.primaryAccounts['urn:ietf:params:jmap:mail']);

export type AccountId = ReadonlyDeep<z.infer<typeof AccountIdSchema>>;

const MethodResponseSchema = z.tuple([
	z.string(), // method name
	z.unknown(), // response data
	z.string(), // call id
]);

export const JmapResponseSchema = z.object({
	methodResponses: z.array(MethodResponseSchema),
	sessionState: z.string(),
});

const EmailAddressSchema = z.object({
	name: z.string().nullable(),
	email: z.string(),
});

export const MailboxSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.string().nullable(),
	totalEmails: z.number(),
	unreadEmails: z.number(),
});

export const MailboxGetResponseSchema = z.object({
	accountId: z.string(),
	state: z.string(),
	list: z.array(MailboxSchema),
	notFound: z.array(z.string()),
});
export type MailboxGetResponse = ReadonlyDeep<z.infer<typeof MailboxGetResponseSchema>>;

export const EmailSchema = z.object({
	id: z.string(),
	subject: z.string().nullable(),
	from: z.array(EmailAddressSchema).nullable(),
	receivedAt: z.string(),
	preview: z.string(),
});

export const EmailGetResponseSchema = z.object({
	accountId: z.string(),
	state: z.string(),
	list: z.array(EmailSchema),
	notFound: z.array(z.string()),
});
export type EmailGetResponse = ReadonlyDeep<z.infer<typeof EmailGetResponseSchema>>;

export const EmailSetResponseSchema = z.object({
	accountId: z.string(),
	oldState: z.string(),
	newState: z.string(),
	updated: z.record(z.string(), z.unknown()).nullable(),
	notUpdated: z.record(z.string(), z.unknown()).nullable(),
});
export type EmailSetResponse = ReadonlyDeep<z.infer<typeof EmailSetResponseSchema>>;
