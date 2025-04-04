import { Logger } from '@nodescript/logger';
import { dep } from 'mesh-ioc';

import { CacheStats, CacheStatsStorage } from './CacheStatsStorage.js';
import { MongoDb } from './MongoDb.js';

interface MongoCacheStats {
    workspaceId: string;
    count: number;
    size: number;
    lastUpdatedAt?: Date;
}

export class MongoCacheStatsStorage extends CacheStatsStorage {

    @dep() private logger!: Logger;
    @dep() private mongodb!: MongoDb;

    private get collection() {
        return this.mongodb.db.collection<MongoCacheStats>('cachestats');
    }

    async setup(): Promise<void> {
        await this.collection.createIndex({
            workspaceId: 1,
        }, { unique: true });
        this.logger.info('Created indexes on cachestats');
    }

    async *getAllStats(): AsyncIterable<CacheStats> {
        const cursor = this.collection.find();
        for await (const doc of cursor) {
            yield this.deserialize(doc);
        }
    }

    async getStats(workspaceId: string): Promise<CacheStats> {
        const doc = await this.collection.findOne({ workspaceId });
        if (!doc) {
            return {
                workspaceId,
                count: 0,
                size: 0,
                lastUpdatedAt: 0,
            };
        }
        return this.deserialize(doc);
    }

    async incrUsage(workspaceId: string, count: number, size: number): Promise<void> {
        await this.collection.updateOne({
            workspaceId
        }, {
            $inc: { count, size },
            $set: { lastUpdatedAt: new Date() },
        });
    }

    async updateUsage(workspaceId: string, count: number, size: number): Promise<void> {
        await this.collection.updateOne({
            workspaceId,
        }, {
            $set: {
                count,
                size,
                lastUpdatedAt: new Date(),
            },
        });
    }

    private deserialize(doc: MongoCacheStats): CacheStats {
        return {
            workspaceId: doc.workspaceId,
            count: doc.count,
            size: doc.size,
            lastUpdatedAt: doc.lastUpdatedAt?.valueOf(),
        };
    }

}
