import { HistogramMetric, metric } from '@nodescript/metrics';

export class Metrics {

    @metric()
    methodLatency = new HistogramMetric<{
        domain: string;
        method: string;
        error?: string;
    }>('nodescript_cache_service_latency', 'Cache service method latency');

}
