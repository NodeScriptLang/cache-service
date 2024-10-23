import { Mesh } from 'mesh-ioc';

import { AuthContext } from './scoped/AuthContext.js';
import { CacheDomainImpl } from './scoped/CacheDomainImpl.js';
import { CacheProtocolHandler } from './scoped/CacheProtocolHandler.js';
import { CacheProtocolImpl } from './scoped/CacheProtocolImpl.js';
import { HttpAuthHandler } from './scoped/HttpAuthHandler.js';

export class HttpScope extends Mesh {

    constructor(parent: Mesh) {
        super('HttpScope', parent);
        this.service(AuthContext);
        this.service(CacheDomainImpl);
        this.service(CacheProtocolImpl);
        this.service(CacheProtocolHandler);
        this.service(HttpAuthHandler);
    }

}
