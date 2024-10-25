import { Permission } from '@nodescript/api-proto';
import assert from 'assert';

import { runtime } from './runtime.js';

describe('Cache.delete', () => {

    beforeEach(async () => runtime.setupDatabases());
    afterEach(async () => runtime.stopDatabases());

    beforeEach(async () => {
        await runtime.cacheStorage.upsertData('a-team', 'test1', 'Hello A', Date.now() + 60_000);
        await runtime.cacheStorage.upsertData('b-team', 'test2', 'Hello B', Date.now() + 60_000);
    });

    context('authorized', () => {

        beforeEach(async () => {
            runtime.authenticateWorkspace('a-org', 'a-team', [Permission.WORKSPACE_CACHE_WRITE]);
        });

        it('deletes existing record', async () => {
            const res = await runtime.api.Cache.delete({ key: 'test1' });
            assert.ok(res);
            const data = await runtime.cacheStorage.getData('a-team', 'test1');
            assert.ok(data == null);
        });

    });

    context('unauthorized', () => {

        beforeEach(async () => {
            runtime.authenticateWorkspace('a-org', 'a-team', []);
        });

        it('throws AccessDeniedError', async () => {
            try {
                await runtime.api.Cache.delete({ key: 'test1' });
                throw new Error('UnexpectedSuccess');
            } catch (error: any) {
                assert.strictEqual(error.name, 'AccessDeniedError');
            }
        });

    });

});
