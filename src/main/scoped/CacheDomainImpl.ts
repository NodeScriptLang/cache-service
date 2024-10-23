import { Permission } from '@nodescript/api-proto';
import { CacheData, CacheDomain } from '@nodescript/cache-protocol';
import { AccessDeniedError } from '@nodescript/errors';
import { config } from 'mesh-config';
import { dep } from 'mesh-ioc';

import { CacheStorage } from '../global/CacheStorage.js';
import { AuthContext } from './AuthContext.js';

// TODO consider replacing hardcoded limits with API quota
export class CacheDomainImpl implements CacheDomain {

    @config({ default: 100_000 })
    private CACHE_MAX_KEYS!: number;

    @config({ default: 100_000_000 })
    private CACHE_MAX_SIZE!: number;

    @config({ default: 1_000_000 })
    private CACHE_MAX_ENTRY_SIZE!: number;

    @dep() private authContext!: AuthContext;
    @dep() private cacheStorage!: CacheStorage;

    async lookup(req: { key: string }): Promise<{ data: CacheData | null }> {
        const token = this.authContext.requireAuth();
        if (!token.workspaceId) {
            throw new AccessDeniedError('Workspace-scoped token required');
        }
        this.authContext.requirePermissions([Permission.WORKSPACE_CACHE_READ]);
        const data = await this.cacheStorage.getData(token.workspaceId, req.key);
        return { data };
    }

    async set(req: { key: string; data: any; expiresAt?: number }): Promise<{}> {
        const token = this.authContext.requireAuth();
        if (!token.workspaceId) {
            throw new AccessDeniedError('Workspace-scoped token required');
        }
        this.authContext.requirePermissions([Permission.WORKSPACE_CACHE_WRITE]);
        const usage = await this.cacheStorage.checkCacheUsage(token.workspaceId, req.key);
        if ((usage.count + 1) > this.CACHE_MAX_KEYS) {
            throw new AccessDeniedError('Maximum number of keys in cache reached');
        }
        const buffer = Buffer.from(JSON.stringify(req.data), 'utf-8');
        if ((usage.size + buffer.byteLength) > this.CACHE_MAX_SIZE) {
            throw new AccessDeniedError('Maximum size of data in cache reached');
        }
        if (buffer.byteLength > this.CACHE_MAX_ENTRY_SIZE) {
            throw new AccessDeniedError(`Entry cannot exceed ${this.CACHE_MAX_ENTRY_SIZE} bytes`);
        }
        await this.cacheStorage.upsertData(token.workspaceId, req.key, buffer, req.expiresAt);
        return {};
    }

    async delete(req: { key: string }): Promise<{}> {
        const token = this.authContext.requireAuth();
        if (!token.workspaceId || !token.orgId) {
            throw new AccessDeniedError('Workspace-scoped token required');
        }
        this.authContext.requirePermissions([Permission.WORKSPACE_CACHE_WRITE]);
        this.cacheStorage.deleteData(token.workspaceId, req.key);
        return {};
    }

}
