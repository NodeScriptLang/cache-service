import { cacheProtocol } from '@nodescript/cache-protocol';
import { ModuleCompute, ModuleDefinition } from '@nodescript/core/types';
import { createHttpClient } from '@nodescript/protocomm';

import { hash } from './util.js';

interface P {
    accessToken: string;
    key: string;
}
type R = Promise<unknown>;

export const module: ModuleDefinition<P, R> = {
    version: '1.0.1',
    moduleName: 'Cache / Delete Value',
    description: 'Removes data from Cache.',
    keywords: ['lookup'],
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
    },
    result: {
        async: true,
        schema: { type: 'any' },
    },
    evalMode: 'manual',
    cacheMode: 'always',
};

export const compute: ModuleCompute<P, R> = async (params, ctx) => {
    const { accessToken, key } = params;
    const cacheKey = await hash('SHA-256', key);
    const baseUrl = ctx.getLocal<string>('NS_CACHE_SERVICE_URL') ?? 'https://cache.nodescript.dev';
    const client = createHttpClient(cacheProtocol, {
        baseUrl,
        headers: {
            authorization: `Bearer ${accessToken}`
        }
    });
    const res = await client.Cache.delete({ key: cacheKey });
    return res;
};