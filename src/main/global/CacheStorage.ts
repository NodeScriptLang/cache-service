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

    abstract getOrgStats(orgId: string): Promise<CacheUsageStats>;

    abstract upsertData(
        orgId: string,
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
