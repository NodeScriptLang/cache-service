export interface CacheStats {
    workspaceId: string;
    count: number;
    size: number;
    lastUpdatedAt?: number;
}

export abstract class CacheStatsStorage {

    abstract setup(): Promise<void>;

    abstract getAllStats(): AsyncIterable<CacheStats>;

    abstract getStats(
        workspaceId: string,
    ): Promise<CacheStats>;

    abstract incrUsage(
        workspaceId: string,
        count: number,
        size: number,
    ): Promise<void>;

    abstract updateUsage(
        workspaceId: string,
        count: number,
        size: number,
    ): Promise<void>;

}
