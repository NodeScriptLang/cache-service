import { CacheProtocol } from '@nodescript/cache-protocol';
import { dep } from 'mesh-ioc';

import { CacheDomainImpl } from './CacheDomainImpl.js';

export class CacheProtocolImpl implements CacheProtocol {

    @dep() Cache!: CacheDomainImpl;

}
