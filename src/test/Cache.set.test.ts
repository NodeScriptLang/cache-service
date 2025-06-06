import { AccountType, Permission } from '@nodescript/api-proto';
import assert from 'assert';

import { runtime } from './runtime.js';

describe('Cache.set', () => {

    beforeEach(async () => runtime.setupDatabases());
    afterEach(async () => runtime.stopDatabases());

    beforeEach(() => {
        runtime.nsApiMock.setMockWorkspace({
            id: 'a-team',
            owner: {
                id: 'jane',
                type: AccountType.USER,
                displayName: 'Joe',
                avatarUrl: '',
            },
            metadata: {
                cacheMaxKeys: 10,
                cacheMaxSize: 10_000,
                cacheMaxEntrySize: 5_000,
            }
        });
    });

    context('authorized', () => {

        beforeEach(async () => {
            runtime.authenticateWorkspace('a-org', 'a-team', [Permission.WORKSPACE_CACHE_WRITE]);
        });

        context('limits not reached', () => {

            beforeEach(async () => {
                await runtime.cacheStorage.upsertData('a-team', 'test1', 'Hello A', Date.now() + 60_000);
                await runtime.cacheStorage.upsertData('b-team', 'test2', 'Hello B', Date.now() + 60_000);
            });

            it('stores the record', async () => {
                await runtime.api.Cache.set({
                    key: 'foo',
                    data: {
                        foo: 42
                    }
                });
                const res = await runtime.cacheStorage.getData('a-team', 'foo');
                assert.ok(res);
                assert.deepStrictEqual(res.data, { foo: 42 });
                assert.strictEqual(res.createdAt, res.updatedAt);
                assert.strictEqual(res.generation, 1);
            });

            it('updates existing record', async () => {
                await runtime.api.Cache.set({
                    key: 'test1',
                    data: {
                        foo: 123
                    }
                });
                const res = await runtime.cacheStorage.getData('a-team', 'test1');
                assert.ok(res);
                assert.deepStrictEqual(res.data, { foo: 123 });
                assert.notStrictEqual(res.createdAt, res.updatedAt);
                assert.strictEqual(res.generation, 2);
            });

        });

        context('keys limit reached', () => {

            beforeEach(async () => {
                for (let i = 0; i < 10; i++) {
                    await runtime.api.Cache.set({
                        data: '123',
                        key: `foo${i}`,
                    });
                }
            });

            it('throws AccessDeniedError', async () => {
                try {
                    await runtime.api.Cache.set({
                        key: 'bar',
                        data: '123',
                    });
                    throw new Error('UnexpectedSuccess');
                } catch (error: any) {
                    assert.strictEqual(error.name, 'AccessDeniedError');
                }
            });

        });

        context('size limit reached', () => {

            beforeEach(async () => {
                for (let i = 0; i < 2; i++) {
                    await runtime.api.Cache.set({
                        key: `test${i}`,
                        data: generatePayload(4998),
                    });
                }
            });

            it('throws AccessDeniedError', async () => {
                try {
                    await runtime.api.Cache.set({
                        key: 'foo',
                        data: '123',
                    });
                    throw new Error('UnexpectedSuccess');
                } catch (error: any) {
                    assert.strictEqual(error.name, 'AccessDeniedError');
                }
            });

        });

        context('big entry', () => {

            it('throws AccessDeniedError', async () => {
                try {
                    await runtime.api.Cache.set({
                        key: 'foo',
                        data: generatePayload(5000),
                    });
                    throw new Error('UnexpectedSuccess');
                } catch (error: any) {
                    assert.strictEqual(error.name, 'AccessDeniedError');
                }
            });

        });

    });

    context('unauthorized', () => {

        beforeEach(async () => {
            runtime.authenticateWorkspace('a-org', 'a-team', []);
        });

        it('throws AccessDeniedError', async () => {
            try {
                await runtime.api.Cache.set({ key: 'foo', data: '123' });
                throw new Error('UnexpectedSuccess');
            } catch (error: any) {
                assert.strictEqual(error.name, 'AccessDeniedError');
            }
        });

    });

});

function generatePayload(size: number) {
    return Buffer.alloc(size, 'x').toString('utf-8');
}
