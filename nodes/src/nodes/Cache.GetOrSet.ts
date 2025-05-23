import { cacheProtocol } from '@nodescript/cache-protocol';
import { ModuleCompute, ModuleDefinition } from '@nodescript/core/types';
import { createHttpClient } from '@nodescript/protocomm';

import { hash } from './util.js';

interface P {
    accessToken: string;
    key: string;
    data: any;
    ttl?: number;
    expiresAt?: number;
}
type R = Promise<unknown>;

export const module: ModuleDefinition<P, R> = {
    version: '1.0.0',
    moduleName: 'Cache / Get Or Set',
    description: 'Returns cached data, if it exists. Otherwise evaluates data, stores it in the cache and returns it.',
    keywords: [],
    params: {
        accessToken: {
            schema: {
                type: 'string',
            },
            attributes: {
                oauthAppId: 'SpOxPv73EysY4EBH'
            },
            hideValue: true,
        },
        key: {
            schema: { type: 'string' },
        },
        data: {
            schema: { type: 'any' },
            deferred: true,
        },
        expiresAt: {
            schema: {
                type: 'number',
                optional: true,
                description: `
                    Expiration timestamp in milliseconds since Epoch.
                    If both expiresAt and ttl are set, expiresAt takes priority.
                `
            },
            advanced: true,
        },
        ttl: {
            schema: {
                type: 'number',
                optional: true,
                description: `
                    Expiration timestamp in milliseconds since current time.
                    If both expiresAt and ttl are set, expiresAt takes priority.
                `
            },
            advanced: true,
        },
    },
    result: {
        async: true,
        schema: { type: 'any' },
    },
    evalMode: 'manual',
    cacheMode: 'always',
};

export const compute: ModuleCompute<P, R> = async (params, ctx) => {
    const cacheKey = await hash('SHA-256', params.key);
    const baseUrl = ctx.getLocal<string>('NS_CACHE_SERVICE_URL') ?? 'https://cache.nodescript.dev';
    const client = createHttpClient(cacheProtocol, {
        baseUrl,
        headers: {
            authorization: `Bearer ${params.accessToken}`
        }
    });
    const { data: existingData } = await client.Cache.lookup({ key: cacheKey });
    if (existingData) {
        return existingData;
    }
    const expiresAt =
        params.expiresAt != null ?
            params.expiresAt :
            params.ttl != null ?
                Date.now() + params.ttl :
                undefined;
    const data = await ctx.resolveDeferred(params.data);
    await client.Cache.set({
        key: cacheKey,
        data,
        expiresAt,
    });
    return {
        key: cacheKey,
        data,
        isNew: true,
    };
};
