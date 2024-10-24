import { CacheProtocol, cacheProtocol } from '@nodescript/cache-protocol';
import { HttpProtocolHandler } from '@nodescript/http-server';
import { dep } from 'mesh-ioc';

import { Metrics } from '../global/Metrics.js';
import { CacheProtocolImpl } from './CacheProtocolImpl.js';

export class CacheProtocolHandler extends HttpProtocolHandler<CacheProtocol> {

    @dep() protocolImpl!: CacheProtocolImpl;
    @dep() metrics!: Metrics;

    protocol = cacheProtocol;

    constructor() {
        super();
        this.methodStats.on(stats => {
            this.metrics.methodLatency.addMillis(stats.latency, {
                domain: stats.domain,
                method: stats.method,
                error: stats.error,
            });
        });
    }

}
