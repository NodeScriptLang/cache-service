import { ProtocolIndex } from '@nodescript/protocomm';

import { CacheDomain } from './domains/CacheDomain.js';

export interface CacheProtocol {
    Cache: CacheDomain;
}

export const cacheProtocol = new ProtocolIndex<CacheProtocol>({
    Cache: CacheDomain,
});
