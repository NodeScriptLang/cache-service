import { CacheData } from '@nodescript/cache-protocol';
import { ServerError } from '@nodescript/errors';
import { Logger } from '@nodescript/logger';
import { dep } from 'mesh-ioc';

import { CacheStorage, CacheUsageStats } from './CacheStorage.js';
import { MongoDb } from './MongoDb.js';

interface MongoCacheData {
    orgId: string;
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
        // For querying limits
        await this.collection.createIndex({
            orgId: 1,
            size: 1,
        });
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
        return doc ? this.deserialize(doc) : null;
    }

    async getOrgStats(orgId: string): Promise<CacheUsageStats> {
        const [doc] = await this.collection.aggregate([
            {
                $match: {
                    orgId
                },
            },
            {
                $project: {
                    orgId: 1,
                    size: 1,
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
        return {
            count: doc.count ?? 0,
            size: doc.size ?? 0,
        };
    }

    async upsertData(
        orgId: string,
        workspaceId: string,
        key: string,
        data: string,
        expiresAt?: number,
    ): Promise<void> {
        const serializedData = Buffer.from(JSON.stringify(data), 'utf-8');
        const res = await this.collection.updateOne({
            workspaceId,
            key,
        }, {
            $setOnInsert: {
                createdAt: new Date(),
            },
            $set: {
                orgId,
                data: serializedData,
                size: serializedData.byteLength,
                updatedAt: new Date(),
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            $inc: {
                generation: 1,
            },
        }, { upsert: true });
        if (res.upsertedCount !== 1) {
            throw new ServerError('Failed to add record to cache');
        }
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
