import { Schema } from 'airtight';

import { CacheKeySchema } from './CacheKey.js';

export interface CacheData {
    key: string;
    data: any;
    size: number;
    generation: number;
    createdAt: number;
    updatedAt: number;
    expiresAt: number | null;
}

export const CacheDataSchema = new Schema<CacheData>({
    type: 'object',
    properties: {
        key: CacheKeySchema.schema,
        data: { type: 'any' },
        size: { type: 'number' },
        generation: { type: 'number' },
        createdAt: { type: 'number' },
        updatedAt: { type: 'number' },
        expiresAt: {
            type: 'number',
            nullable: true,
        },
    }
});
