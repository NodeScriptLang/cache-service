import { AuxHttpServer, BaseApp, JwtService } from '@nodescript/microframework';
import { dep, Mesh } from 'mesh-ioc';

import { CacheStorage } from './global/CacheStorage.js';
import { MongoCacheStorage } from './global/CacheStorage.mongo.js';
import { MainHttpServer } from './global/MainHttpServer.js';
import { Metrics } from './global/Metrics.js';
import { MongoDb } from './global/MongoDb.js';
import { RedisManager } from './global/RedisManager.js';

export class App extends BaseApp {

    @dep() private mongodb!: MongoDb;
    @dep() private redis!: RedisManager;
    @dep() private mainHttpServer!: MainHttpServer;
    @dep() private auxHttpServer!: AuxHttpServer;
    @dep() private cacheStorage!: CacheStorage;

    constructor() {
        super(new Mesh('App'));
        this.mesh.service(AuxHttpServer);
        this.mesh.service(CacheStorage, MongoCacheStorage);
        this.mesh.service(JwtService);
        this.mesh.service(MainHttpServer);
        this.mesh.service(Metrics);
        this.mesh.service(MongoDb);
        this.mesh.service(RedisManager);
    }

    override async start() {
        await super.start();
        await this.mongodb.start();
        await this.redis.start();
        await this.cacheStorage.setup();
        await this.mainHttpServer.start();
        await this.auxHttpServer.start();
    }

    override async stop() {
        await super.stop();
        await this.mainHttpServer.stop();
        await this.auxHttpServer.stop();
        await this.mongodb.stop();
        await this.redis.stop();
    }

}
