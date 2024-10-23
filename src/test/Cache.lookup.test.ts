import { Permission } from '@nodescript/api-proto';
import assert from 'assert';

import { runtime } from './runtime.js';

describe('Cache.lookup', () => {

    beforeEach(async () => runtime.setupDatabases());
    afterEach(async () => runtime.stopDatabases());

    beforeEach(async () => {
        await runtime.cacheStorage.upsertData('a-team', 'test1', 'Hello A');
        await runtime.cacheStorage.upsertData('b-team', 'test2', 'Hello B');
    });

    context('authorized', () => {

        beforeEach(async () => {
            runtime.authenticateWorkspace('a-org', 'a-team', [Permission.WORKSPACE_CACHE_READ]);
        });

        it('returns existing record in the authenticated workspace', async () => {
            const res = await runtime.api.Cache.lookup({ key: 'test1' });
            assert.ok(res.data);
            assert.strictEqual(res.data.key, 'test1');
            assert.strictEqual(res.data.data, 'Hello A');
            assert.strictEqual(res.data.generation, 1);
            assert.strictEqual(res.data.size, JSON.stringify('Hello A').length);
        });

        it('returns null for records outside of workspace', async () => {
            const res = await runtime.api.Cache.lookup({ key: 'test2' });
            assert.ok(res.data == null);
        });

    });

    context('unauthorized', () => {

        beforeEach(async () => {
            runtime.authenticateWorkspace('a-org', 'a-team', []);
        });

        it('throws AccessDeniedError', async () => {
            try {
                await runtime.api.Cache.lookup({ key: 'test1' });
                throw new Error('UnexpectedSuccess');
            } catch (error: any) {
                assert.strictEqual(error.name, 'AccessDeniedError');
            }
        });

    });

});
