import { Permission } from '@nodescript/api-proto';
import assert from 'assert';

import { runtime } from './runtime.js';

describe('Cache.set', () => {

    beforeEach(async () => runtime.setupDatabases());
    afterEach(async () => runtime.stopDatabases());

    context('authorized', () => {

        beforeEach(async () => {
            runtime.authenticateWorkspace('a-org', 'a-team', [Permission.WORKSPACE_CACHE_WRITE]);
        });

        context('limits not reached', () => {

            beforeEach(async () => {
                await runtime.cacheStorage.upsertData('a-team', 'test1', 'Hello A');
                await runtime.cacheStorage.upsertData('b-team', 'test2', 'Hello B');
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
                // See .env.test
                for (let i = 0; i < 10; i++) {
                    await runtime.cacheStorage.upsertData('a-team', `foo${i}`, '123');
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
                await runtime.cacheStorage.upsertData(
                    'a-team',
                    'test1',
                    generatePayload(10_000), // See .env.test
                );
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
                        data: generatePayload(5000), // See .env.test
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
    return [...Array(size).keys()];
}
