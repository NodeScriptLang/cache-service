import { Permission } from '@nodescript/api-proto';
import { CacheData, CacheDomain } from '@nodescript/cache-protocol';
import { AccessDeniedError, RateLimitExceededError } from '@nodescript/errors';
import { config } from 'mesh-config';
import { dep } from 'mesh-ioc';

import { CacheStorage } from '../global/CacheStorage.js';
import { RedisManager } from '../global/RedisManager.js';
import { AuthContext } from './AuthContext.js';
import { NodeScriptApi } from './NodeScriptApi.js';

export class CacheDomainImpl implements CacheDomain {

    @config({ default: 100_000 })
    private CACHE_MAX_KEYS!: number;

    @config({ default: 100_000_000 })
    private CACHE_MAX_SIZE!: number;

    @config({ default: 1_000_000 })
    private CACHE_MAX_ENTRY_SIZE!: number;

    @config({ default: 200 })
    private CACHE_RATE_LIMIT!: number;

    @config({ default: 5 })
    private CACHE_RATE_LIMIT_WINDOW!: number;

    @dep() private authContext!: AuthContext;
    @dep() private cacheStorage!: CacheStorage;
    @dep() private nsApi!: NodeScriptApi;
    @dep() private redis!: RedisManager;

    async lookup(req: { key: string }): Promise<{ data: CacheData | null }> {
        const token = this.authContext.requireAuth();
        if (!token.workspaceId) {
            throw new AccessDeniedError('Workspace-scoped token required');
        }
        await this.checkRateLimit(token.workspaceId);
        this.authContext.requirePermissions([Permission.WORKSPACE_CACHE_READ]);
        const data = await this.cacheStorage.getData(token.workspaceId, req.key);
        return { data };
    }

    async set(req: { key: string; data: any; expiresAt?: number }): Promise<{}> {
        const token = this.authContext.requireAuth();
        if (!token.workspaceId) {
            throw new AccessDeniedError('Workspace-scoped token required');
        }
        await this.checkRateLimit(token.workspaceId);
        this.authContext.requirePermissions([Permission.WORKSPACE_CACHE_WRITE]);
        const workspace = await this.nsApi.getWorkspace(token.workspaceId);
        const maxKeys = Number(workspace.metadata.cacheMaxKeys) || this.CACHE_MAX_KEYS;
        const maxSize = Number(workspace.metadata.cacheMaxSize) || this.CACHE_MAX_SIZE;
        const maxEntrySize = Number(workspace.metadata.cacheMaxEntrySize) || this.CACHE_MAX_ENTRY_SIZE;
        const usage = await this.cacheStorage.checkCacheUsage(token.workspaceId, req.key);
        if ((usage.count + 1) > maxKeys) {
            throw new AccessDeniedError('Maximum number of keys in cache reached');
        }
        const buffer = Buffer.from(JSON.stringify(req.data), 'utf-8');
        if ((usage.size + buffer.byteLength) > maxSize) {
            throw new AccessDeniedError('Maximum size of data in cache reached');
        }
        if (buffer.byteLength > maxEntrySize) {
            throw new AccessDeniedError(`Entry cannot exceed ${maxEntrySize} bytes`);
        }
        await this.cacheStorage.upsertData(token.workspaceId, req.key, buffer, req.expiresAt);
        return {};
    }

    async delete(req: { key: string }): Promise<{}> {
        const token = this.authContext.requireAuth();
        if (!token.workspaceId) {
            throw new AccessDeniedError('Workspace-scoped token required');
        }
        await this.checkRateLimit(token.workspaceId);
        this.authContext.requirePermissions([Permission.WORKSPACE_CACHE_WRITE]);
        this.cacheStorage.deleteData(token.workspaceId, req.key);
        return {};
    }

    private async checkRateLimit(workspaceId: string) {
        const { remaining } = await this.getRateLimit(workspaceId);
        if (remaining <= 0) {
            throw new RateLimitExceededError();
        }
    }

    private async getRateLimit(workspaceId: string): Promise<{ limit: number; remaining: number }> {
        const window = Math.round(Date.now() / this.CACHE_RATE_LIMIT_WINDOW / 1000);
        const limit = this.CACHE_RATE_LIMIT * this.CACHE_RATE_LIMIT_WINDOW;
        const key = `Cache:rateLimit:${workspaceId}:${window}`;
        const requestCount = await this.redis.client.incr(key);
        await this.redis.client.expire(key, this.CACHE_RATE_LIMIT_WINDOW * 2);
        const remaining = Math.max(limit - requestCount, 0);
        return { limit, remaining };
    }

}
