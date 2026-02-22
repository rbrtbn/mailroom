import { okAsync } from 'neverthrow';
import { describe, expect, it } from 'vitest';

import { type CallFn, execute, getMailboxes } from './operations';
import type { JmapSession } from './schemas';
// Import your worker so you can unit test it

const fakeSession: JmapSession = {
	apiUrl: 'https://jmap.example.com/api/',
	downloadUrl: 'https://jmap.example.com/download/',
	uploadUrl: 'https://jmap.example.com/upload/',
	eventSourceUrl: 'https://jmap.example.com/events/',
	state: 's1',
	primaryAccounts: { 'urn:ietf:params:jmap:mail': 'acc-1' },
	accounts: { 'acc-1': { name: 'Test', isPersonal: true, accountCapabilities: {} } },
	capabilities: {},
};

describe('execute', () => {
	it('wires operation to call and parses response', async () => {
		const mockCall: CallFn = () =>
			okAsync([{ accountId: 'a', state: 's', list: [], notFound: [] }]);

		const result = await execute(fakeSession, mockCall, getMailboxes);
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().list).toEqual([]);
	});
});
