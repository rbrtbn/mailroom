import { describe, expect, it } from 'vitest';

import { extractDomain, groupByDomain } from './handlers';

describe('extractDomain', () => {
	it('extracts domain from a standard email', () => {
		expect(extractDomain('alice@example.com')).toBe('example.com');
	});

	it('extracts domain from email with subdomain', () => {
		expect(extractDomain('noreply@mail.github.com')).toBe('mail.github.com');
	});

	it('returns _unknown for missing @', () => {
		expect(extractDomain('not-an-email')).toBe('_unknown');
	});

	it('returns _unknown for trailing @', () => {
		expect(extractDomain('user@')).toBe('_unknown');
	});

	it('returns _unknown for empty string', () => {
		expect(extractDomain('')).toBe('_unknown');
	});

	it('uses last @ for addresses with multiple @', () => {
		expect(extractDomain('"weird@name"@example.com')).toBe('example.com');
	});
});

describe('groupByDomain', () => {
	const makeEmail = (id: string, email: string) => ({
		id,
		subject: `Subject ${id}`,
		from: [{ name: null, email }],
		receivedAt: '2025-01-01T00:00:00Z',
		preview: 'preview',
	});

	it('groups emails by sender domain', () => {
		const emails = [
			makeEmail('1', 'alice@github.com'),
			makeEmail('2', 'bob@github.com'),
			makeEmail('3', 'carol@gitlab.com'),
		];

		const result = groupByDomain(emails);

		expect(result['github.com']?.emails.length).toBe(2);
		expect(result['github.com']?.emails).toHaveLength(2);
		expect(result['gitlab.com']?.emails.length).toBe(1);
	});

	it('uses _unknown for emails with no from address', () => {
		const emails = [
			{ id: '1', subject: null, from: null, receivedAt: '2025-01-01T00:00:00Z', preview: '' },
		];

		const result = groupByDomain(emails);
		expect(result['_unknown']?.emails.length).toBe(1);
	});

	it('returns empty object for empty input', () => {
		expect(groupByDomain([])).toEqual({});
	});
});
