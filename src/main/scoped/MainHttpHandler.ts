import { HttpChain, HttpContext, HttpCorsHandler, HttpErrorHandler, HttpHandler, HttpNext } from '@nodescript/http-server';
import { dep } from 'mesh-ioc';

import { CacheProtocolHandler } from './CacheProtocolHandler.js';
import { HttpAuthHandler } from './HttpAuthHandler.js';

export class MainHttpHandler implements HttpHandler {

    @dep() private errorHandler!: HttpErrorHandler;
    @dep() private authHandler!: HttpAuthHandler;
    @dep() private cacheProtocolHandler!: CacheProtocolHandler;
    @dep() private corsHandler!: HttpCorsHandler;

    private handler = new HttpChain([
        this.errorHandler,
        this.authHandler,
        this.corsHandler,
        this.cacheProtocolHandler,
    ]);

    async handle(ctx: HttpContext, next: HttpNext) {
        await this.handler.handle(ctx, next);
    }

}
