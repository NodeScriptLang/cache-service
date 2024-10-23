import { CacheProtocol, mongoProtocol } from '@nodescript/cache-protocol';
import { HttpProtocolHandler } from '@nodescript/http-server';
import { HistogramMetric, metric } from '@nodescript/metrics';
import { dep } from 'mesh-ioc';

import { CacheProtocolImpl } from './CacheProtocolImpl.js';

export class CacheProtocolHandler extends HttpProtocolHandler<CacheProtocol> {

    @dep() protocolImpl!: CacheProtocolImpl;

    protocol = mongoProtocol;

    @metric()
    private methodLatency = new HistogramMetric<{
        domain: string;
        method: string;
        error?: string;
    }>('nodescript_mongodb_adapter_latency', 'MondoDB adapter method latency');

    constructor() {
        super();
        this.methodStats.on(stats => {
            this.methodLatency.addMillis(stats.latency, {
                domain: stats.domain,
                method: stats.method,
                error: stats.error,
            });
        });
    }

}
