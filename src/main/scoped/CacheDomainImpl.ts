import { Permission } from '@nodescript/api-proto';
import { CacheData, CacheDomain } from '@nodescript/cache-protocol';
import { AccessDeniedError } from '@nodescript/errors';
import { config } from 'mesh-config';
import { dep } from 'mesh-ioc';

import { CacheStatsStorage } from '../global/CacheStatsStorage.js';
import { CacheStorage } from '../global/CacheStorage.js';
import { RedisManager } from '../global/RedisManager.js';
import { AuthContext } from './AuthContext.js';
import { NodeScriptApi } from './NodeScriptApi.js';

export class CacheDomainImpl implements CacheDomain {

    @config({ default: 100_000 })
    private CACHE_MAX_KEYS!: number;

    @config({ default: 50_000_000 })
    private CACHE_MAX_SIZE!: number;

    @config({ default: 500_000 })
    private CACHE_MAX_ENTRY_SIZE!: number;

    @config({ default: 100 })
    private CACHE_RATE_LIMIT!: number;

    @config({ default: 5 })
    private CACHE_RATE_LIMIT_WINDOW_SECONDS!: number;

    @config({ default: 200 })
    private CACHE_RATE_LIMIT_SLOWDOWN_MS!: number;

    @config({ default: 180 * 24 * 60 * 60 * 1000 })
    private CACHE_MAX_RETENTION_MS!: number;

    @dep() private authContext!: AuthContext;
    @dep() private cacheStorage!: CacheStorage;
    @dep() private cacheStatsStorage!: CacheStatsStorage;
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
        // Note: since we store aggregated stats, we need to also fetch data to understand how to update the stats
        const data = await this.cacheStorage.getData(token.workspaceId, req.key);
        const isNew = data == null;
        const stats = await this.cacheStatsStorage.getStats(token.workspaceId);
        // Max keys check
        if (isNew && (stats.count + 1) > maxKeys) {
            throw new AccessDeniedError('Maximum number of keys in cache reached');
        }
        // Max size check
        const buffer = Buffer.from(JSON.stringify(req.data), 'utf-8');
        const oldSize = isNew ? 0 : data.size;
        const newSize = buffer.byteLength;
        if (newSize > maxEntrySize) {
            throw new AccessDeniedError(`Entry cannot exceed ${maxEntrySize} bytes`);
        }
        const sizeDelta = newSize - oldSize;
        if ((stats.size + sizeDelta) > maxSize) {
            throw new AccessDeniedError('Maximum size of data in cache reached');
        }
        // Update stats
        // Note: we're not super accurate here (esp. around race conditions),
        // we just need to have some rough limits to prevent abuse.
        // The exact stats are re-calculated periodically to remove accumulated inaccuracies.
        await this.cacheStatsStorage.incrUsage(token.workspaceId, isNew ? 1 : 0, sizeDelta);
        // Write data
        const expiresAt = this.evalExpirationTime(req.expiresAt);
        await this.cacheStorage.upsertData(token.workspaceId, req.key, buffer, expiresAt);
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
            // Experimental: add slowdown instead of throwing errors
            await new Promise(r => setTimeout(r, this.CACHE_RATE_LIMIT_SLOWDOWN_MS));
            // throw new RateLimitExceededError();
        }
    }

    private async getRateLimit(workspaceId: string): Promise<{ limit: number; remaining: number }> {
        const window = Math.round(Date.now() / this.CACHE_RATE_LIMIT_WINDOW_SECONDS / 1000);
        const limit = this.CACHE_RATE_LIMIT * this.CACHE_RATE_LIMIT_WINDOW_SECONDS;
        const key = `Cache:rateLimit:${workspaceId}:${window}`;
        const requestCount = await this.redis.client.incr(key);
        await this.redis.client.expire(key, this.CACHE_RATE_LIMIT_WINDOW_SECONDS * 2);
        const remaining = Math.max(limit - requestCount, 0);
        return { limit, remaining };
    }

    private evalExpirationTime(expiresAt?: number | null) {
        const maxExpiresAt = Date.now() + this.CACHE_MAX_RETENTION_MS;
        return expiresAt == null ? maxExpiresAt : Math.min(expiresAt, maxExpiresAt);
    }

}
