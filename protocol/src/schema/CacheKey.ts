import { Schema } from 'airtight';

export type CacheKey = string;

export const CacheKeySchema = new Schema<CacheKey>({
    type: 'string',
    regex: '^[0-9a-zA-Z+/=_-]{20,64}'
});
