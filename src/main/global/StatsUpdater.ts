import { Logger } from '@nodescript/logger';
import { config } from 'mesh-config';
import { dep } from 'mesh-ioc';

import { CacheStatsStorage } from './CacheStatsStorage.js';
import { CacheStorage } from './CacheStorage.js';

export class StatsUpdater {

    @config({ default: 60_000 })
    private STATS_UPDATER_INTERVAL_MS!: number;

    @config({ default: true })
    private STATS_UPDATER_ENABLED!: boolean;

    @dep() private logger!: Logger;
    @dep() private cacheStatsStorage!: CacheStatsStorage;
    @dep() private cacheStorage!: CacheStorage;

    private running = false;
    private runPromise: Promise<void> | null = null;

    async start() {
        if (!this.STATS_UPDATER_ENABLED) {
            return;
        }
        if (this.running) {
            return;
        }
        this.running = true;
        this.runPromise = this.run();
    }

    async stop() {
        this.running = false;
        await this.runPromise;
    }

    private async run() {
        while (this.running) {
            await this.updateStats();
            await new Promise(resolve => setTimeout(resolve, this.STATS_UPDATER_INTERVAL_MS));
        }
    }

    private async updateStats() {
        try {
            this.logger.info('Updating stats');
            for await (const stat of this.cacheStatsStorage.getAllStats()) {
                const actualUsage = await this.cacheStorage.calcUsage(stat.workspaceId);
                await this.cacheStatsStorage.updateUsage(stat.workspaceId, actualUsage.count, actualUsage.size);
            }
            this.logger.info('Stats updated');
        } catch (error) {
            this.logger.error('Error updating stats', { error });
        }
    }

}
