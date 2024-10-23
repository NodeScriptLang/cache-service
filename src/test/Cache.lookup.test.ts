import { Permission } from '@nodescript/api-proto';
import assert from 'assert';

import { runtime } from './runtime.js';

describe('Cache.lookup', () => {

    beforeEach(async () => runtime.setupDatabases());
    afterEach(async () => runtime.stopDatabases());

    beforeEach(async () => {
        await runtime.cacheStorage.upsertData('a-org', 'a-team', 'test', 'Hello A');
        await runtime.cacheStorage.upsertData('b-org', 'b-team', 'test', 'Hello B');
    });

    context('authenticated', () => {

        beforeEach(async () => {
            runtime.authenticateWorkspace('a-org', 'a-team', [Permission.WORKSPACE_CACHE_READ]);
        });

        it('returns existing record in the authenticated workspace', async () => {
            const res = await runtime.api.Cache.lookup({ key: 'test' });
            assert.ok(res.data);
            assert.strictEqual(res.data.key, 'test');
            assert.strictEqual(res.data.data, 'Hello A');
            assert.strictEqual(res.data.size, JSON.stringify('Hello A').length);
        });

    });

});
