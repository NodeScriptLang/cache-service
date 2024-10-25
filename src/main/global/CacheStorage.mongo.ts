import { CacheData } from '@nodescript/cache-protocol';
import { Logger } from '@nodescript/logger';
import { dep } from 'mesh-ioc';

import { CacheStorage, CacheUsageStats } from './CacheStorage.js';
import { MongoDb } from './MongoDb.js';

interface MongoCacheData {
    workspaceId: string;
    key: string;
    data: Buffer;
    size: number;
    generation: number;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
}

export class MongoCacheStorage extends CacheStorage {

    @dep() private logger!: Logger;
    @dep() private mongodb!: MongoDb;

    private get collection() {
        return this.mongodb.db.collection<MongoCacheData>('cachedata');
    }

    async setup(): Promise<void> {
        // For lookups
        await this.collection.createIndex({
            workspaceId: 1,
            key: 1,
        }, { unique: true });
        // For TTL expiration
        await this.collection.createIndex({
            expiresAt: 1,
        }, { expireAfterSeconds: 0 });
        this.logger.info('Created indexes on cachedata');
    }

    async getData(workspaceId: string, key: string): Promise<CacheData | null> {
        const doc = await this.collection.findOne({
            workspaceId,
            key,
        });
        if (!doc) {
            return null;
        }
        const expired = !!doc.expiresAt && Date.now() > doc.expiresAt.valueOf();
        return expired ? null : this.deserialize(doc);
    }

    async checkCacheUsage(workspaceId: string, key: string): Promise<CacheUsageStats> {
        const res = await this.collection.aggregate([
            {
                $match: {
                    workspaceId,
                    key: { $ne: key },
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    size: { $sum: '$size' },
                },
            }
        ]).toArray();
        const doc = res[0] ?? { count: 0, size: 0 };
        return {
            count: doc.count ?? 0,
            size: doc.size ?? 0,
        };
    }

    async upsertData(
        workspaceId: string,
        key: string,
        data: any,
        expiresAt?: number,
    ): Promise<void> {
        const buffer = data instanceof Buffer ? data : Buffer.from(JSON.stringify(data), 'utf-8');
        await this.collection.updateOne({
            workspaceId,
            key,
        }, {
            $setOnInsert: {
                createdAt: new Date(),
            },
            $set: {
                data: buffer,
                size: buffer.byteLength,
                updatedAt: new Date(),
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            $inc: {
                generation: 1,
            },
        }, { upsert: true });
    }

    async deleteData(workspaceId: string, key: string): Promise<void> {
        await this.collection.deleteOne({
            workspaceId,
            key,
        });
    }

    private deserialize(doc: MongoCacheData): CacheData {
        return {
            key: doc.key,
            data: JSON.parse(doc.data.toString('utf-8')),
            size: doc.size,
            generation: doc.generation,
            createdAt: doc.createdAt.valueOf(),
            updatedAt: doc.updatedAt.valueOf(),
            expiresAt: doc.expiresAt?.valueOf() ?? null,
        };
    }

}
