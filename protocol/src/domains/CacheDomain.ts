import { DomainDef } from '@nodescript/protocomm';

import { CacheData, CacheDataSchema } from '../schema/CacheData.js';

export interface CacheDomain {

    lookup(req: {
        key: string;
    }): Promise<{
        data: CacheData | null;
    }>;

    set(req: {
        key: string;
        data: any;
        expiresAt?: number;
    }): Promise<{}>;

    delete(req: {
        key: string;
    }): Promise<{}>;

}

export const CacheDomain: DomainDef<CacheDomain> = {
    name: 'Cache',
    methods: {
        lookup: {
            type: 'query',
            params: {
                key: { type: 'string' },
            },
            returns: {
                data: {
                    ...CacheDataSchema.schema,
                    nullable: true,
                },
            },
        },
        set: {
            type: 'command',
            params: {
                key: { type: 'string' },
                data: { type: 'any' },
                expiresAt: {
                    type: 'number',
                    optional: true,
                },
            },
            returns: {},
        },
        delete: {
            type: 'command',
            params: {
                key: { type: 'string' },
            },
            returns: {},
        },
    },
    events: {},
};
