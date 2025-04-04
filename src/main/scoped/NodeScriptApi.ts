import { ApiProtocol, apiProtocol, Workspace } from '@nodescript/api-proto';
import { HttpContext } from '@nodescript/http-server';
import { createHttpClient } from '@nodescript/protocomm';
import { LRUCache } from 'lru-cache';
import { config } from 'mesh-config';
import { dep } from 'mesh-ioc';

export class NodeScriptApi {

    @config({ default: 'https://api.nodescript.dev' })
    NODESCRIPT_API_URL!: string;

    @config({ default: 100_000 })
    WORKSPACE_CACHE_MAX_COUNT!: number;

    @config({ default: 60_000 })
    WORKSPACE_CACHE_TTL!: number;

    @dep() private ctx!: HttpContext;

    private workspaceCache = new LRUCache<string, Workspace>({
        max: this.WORKSPACE_CACHE_MAX_COUNT,
        ttl: this.WORKSPACE_CACHE_TTL,
    });

    async getWorkspace(workspaceId: string): Promise<Workspace> {
        const cached = this.workspaceCache.get(workspaceId);
        if (cached) {
            return cached;
        }
        const client = this.createClient();
        const { workspace } = await client.Workspace.getWorkspaceById({ id: workspaceId });
        this.workspaceCache.set(workspaceId, workspace);
        return workspace;
    }

    protected createClient(): ApiProtocol {
        return createHttpClient(apiProtocol, {
            baseUrl: this.NODESCRIPT_API_URL,
            headers: {
                'Authorization': this.ctx.getRequestHeader('Authorization', ''),
            },
        });
    }

}
