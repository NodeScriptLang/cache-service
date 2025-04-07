import { AuxHttpServer, BaseApp, JwtService } from '@nodescript/microframework';
import { dep, Mesh } from 'mesh-ioc';

import { CacheStatsStorage } from './global/CacheStatsStorage.js';
import { MongoCacheStatsStorage } from './global/CacheStatsStorage.mongo.js';
import { CacheStorage } from './global/CacheStorage.js';
import { MongoCacheStorage } from './global/CacheStorage.mongo.js';
import { MainHttpServer } from './global/MainHttpServer.js';
import { Metrics } from './global/Metrics.js';
import { MongoDb } from './global/MongoDb.js';
import { RedisManager } from './global/RedisManager.js';
import { StatsUpdater } from './global/StatsUpdater.js';

export class App extends BaseApp {

    @dep() private mongodb!: MongoDb;
    @dep() private redis!: RedisManager;
    @dep() private mainHttpServer!: MainHttpServer;
    @dep() private auxHttpServer!: AuxHttpServer;
    @dep() private cacheStorage!: CacheStorage;
    @dep() private cacheStatsStorage!: CacheStatsStorage;
    @dep() private statsUpdater!: StatsUpdater;

    constructor() {
        super(new Mesh('App'));
        this.mesh.service(AuxHttpServer);
        this.mesh.service(CacheStorage, MongoCacheStorage);
        this.mesh.service(CacheStatsStorage, MongoCacheStatsStorage);
        this.mesh.service(JwtService);
        this.mesh.service(MainHttpServer);
        this.mesh.service(Metrics);
        this.mesh.service(MongoDb);
        this.mesh.service(RedisManager);
        this.mesh.service(StatsUpdater);
    }

    override async start() {
        await super.start();

        await this.mongodb.start();
        await this.redis.start();

        await this.cacheStorage.setup();
        await this.cacheStatsStorage.setup();

        await this.mainHttpServer.start();
        await this.auxHttpServer.start();
        await this.statsUpdater.start();
    }

    override async stop() {
        await super.stop();

        await this.statsUpdater.stop();
        await this.mainHttpServer.stop();
        await this.auxHttpServer.stop();

        await this.mongodb.stop();
        await this.redis.stop();
    }

}
