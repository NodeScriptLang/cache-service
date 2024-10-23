import { Permission } from '@nodescript/api-proto';
import { CacheData, CacheDomain } from '@nodescript/cache-protocol';
import { AccessDeniedError } from '@nodescript/errors';
import { dep } from 'mesh-ioc';

import { CacheStorage } from '../global/CacheStorage.js';
import { AuthContext } from './AuthContext.js';

export class CacheDomainImpl implements CacheDomain {

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

    async set(_req: { key: string; value: string; expiresAt?: number }): Promise<{}> {
        throw new Error('Method not implemented.');
    }

    async delete(_req: { key: string }): Promise<{}> {
        throw new Error('Method not implemented.');
    }

}
