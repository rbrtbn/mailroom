import type { ReadonlyDeep } from 'type-fest';
import { z } from 'zod/v4';

import type { EmailGetResponse } from './jmap/schemas';
import { safeJsonBody, safeParse } from './lib/fetch';
import { safeKvGet, safeKvPut } from './lib/kv';
import { httpErr, jsonFromHandlerError, jsonOk } from './lib/response';
import type { Handler } from './lib/types';

// ── Pure helpers ────────────────────────────────────────────────────

export const extractDomain = (email: string): string => {
	const at = email.lastIndexOf('@');
	return at === -1 ? '_unknown' : email.slice(at + 1) || '_unknown';
};

type EmailEntry = EmailGetResponse['list'][number];

type DomainGroup = ReadonlyDeep<{
	emails: EmailEntry[];
}>;

export const groupByDomain = (
	emails: readonly EmailEntry[],
): ReadonlyDeep<Record<string, DomainGroup>> =>
	emails.reduce<ReadonlyDeep<Record<string, DomainGroup>>>((acc, email) => {
		const domain = extractDomain(email.from?.[0]?.email ?? '');
		const existing = acc[domain];
		const updated: DomainGroup = existing
			? { emails: [...existing.emails, email] }
			: { emails: [email] };
		return { ...acc, [domain]: updated };
	}, {});

// ── Schemas ─────────────────────────────────────────────────────────

const UnenrichedQuerySchema = z.object({
	from: z.string().optional(),
	subject: z.string().optional(),
	before: z.string().optional(),
	after: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
	inMailbox: z.string().optional(),
});

const EnrichBodySchema = z.object({
	ids: z.array(z.string().nonempty()).nonempty(),
});

// ── POST /init ──────────────────────────────────────────────────────

export const handleInit: Handler = (_req, env, client) =>
	safeKvGet(env.STATE_KV, 'email:sinceState')
		.andThen((existing) =>
			existing !== null
				? httpErr(409, 'Already initialized')
				: client.queryEmails({
						filter: { notKeyword: '$seen' },
						sort: [{ property: 'receivedAt', isAscending: true }],
						limit: 1,
					}),
		)
		.andThen((emails) => {
			const email = emails.list[0];
			return email
				? safeKvPut(env.STATE_KV, 'email:sinceState', emails.state).map(() => ({
						email: {
							id: email.id,
							subject: email.subject,
							from: email.from,
							receivedAt: email.receivedAt,
							preview: email.preview,
						},
						state: emails.state,
					}))
				: httpErr(404, 'No unread emails found');
		})
		.match(jsonOk, jsonFromHandlerError);

// ── GET /emails/unenriched ──────────────────────────────────────────

const buildUnenrichedFilter = (
	params: ReadonlyDeep<z.infer<typeof UnenrichedQuerySchema>>,
): ReadonlyDeep<Record<string, unknown>> => ({
	notKeyword: '$enriched',
	...(params.from && { from: params.from }),
	...(params.subject && { subject: params.subject }),
	...(params.before && { before: params.before }),
	...(params.after && { after: params.after }),
	...(params.inMailbox && { inMailbox: params.inMailbox }),
});

export const handleUnenriched: Handler = (req, _env, client) => {
	const url = new URL(req.url);
	const raw = Object.fromEntries(url.searchParams);

	return safeParse(UnenrichedQuerySchema, raw)
		.asyncAndThen((params) =>
			client.queryEmails({
				filter: buildUnenrichedFilter(params),
				sort: [{ property: 'receivedAt', isAscending: false }],
				limit: params.limit,
			}),
		)
		.map((emails: ReadonlyDeep<EmailGetResponse>) => ({
			emails: emails.list,
			state: emails.state,
		}))
		.match(jsonOk, jsonFromHandlerError);
};

// ── POST /emails/enrich ─────────────────────────────────────────────

export const handleEnrich: Handler = (req, _env, client) =>
	safeJsonBody(req)
		.andThen((body) => safeParse(EnrichBodySchema, body))
		.andThen((parsed) => client.getEmailsByIds(parsed.ids))
		.map((emails) => {
			const grouped = groupByDomain(emails.list);
			const domains = Object.fromEntries(
				Object.entries(grouped).map(([domain, group]) => [
					domain,
					{ count: group.emails.length, emails: group.emails },
				]),
			);
			return {
				domains,
				totalEmails: emails.list.length,
				totalDomains: Object.keys(domains).length,
				notFound: emails.notFound,
			};
		})
		.match(jsonOk, jsonFromHandlerError);
