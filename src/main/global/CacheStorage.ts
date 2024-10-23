import { CacheData } from '@nodescript/cache-protocol';

export interface CacheUsageStats {
    count: number;
    size: number;
}

export abstract class CacheStorage {

    abstract setup(): Promise<void>;

    abstract getData(
        workspaceId: string,
        key: string,
    ): Promise<CacheData | null>;

    abstract checkCacheUsage(
        workspaceId: string,
        key: string,
    ): Promise<CacheUsageStats>;

    abstract upsertData(
        workspaceId: string,
        key: string,
        data: any,
        expiresAt?: number,
    ): Promise<void>;

    abstract deleteData(
        workspaceId: string,
        key: string,
    ): Promise<void>;

}
