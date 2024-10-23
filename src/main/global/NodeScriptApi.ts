import { ApiProtocol, apiProtocol } from '@nodescript/api-proto';
import { createHttpClient } from '@nodescript/protocomm';
import { config } from 'mesh-config';

export class NodeScriptApi {

    @config({ default: 'https://api.nodescript.dev' })
    NODESCRIPT_API_URL!: string;

    getClient(authToken: string): ApiProtocol {
        return createHttpClient(apiProtocol, {
            baseUrl: this.NODESCRIPT_API_URL,
            headers: {
                'authorization': `Bearer ${authToken}`,
            },
        });
    }

}
