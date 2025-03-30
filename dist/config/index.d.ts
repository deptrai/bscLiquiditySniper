interface DexConfig {
    ROUTER?: string;
    FACTORY?: string;
    V2_ROUTER?: string;
    V3_ROUTER?: string;
    V2_FACTORY?: string;
    V3_FACTORY?: string;
    SMART_ROUTER?: string;
}
interface Config {
    DEX_ADDRESSES: {
        [key: string]: DexConfig;
    };
    WBNB: string;
    SMART_ROUTER_METHODS: {
        [key: string]: string;
    };
    V2_FILTER: {
        address: string;
        topics: string[];
        fromBlock: number | string;
        toBlock: number | string;
    };
    V3_FILTER: {
        address: string;
        topics: string[];
        fromBlock: number | string;
        toBlock: number | string;
    };
    SMART_ROUTER_FILTER: {
        address: string;
        topics: string[];
        fromBlock: number | string;
        toBlock: number | string;
    };
    SECRET_KEY: string;
    MONGODB_URI?: string;
    TELEGRAM: {
        BOT_TOKEN?: string;
        CHAT_ID?: string;
    };
    APP: {
        PORT: number | string;
        NODE_ENV: string;
    };
    RPC: {
        QUICKNODE: string;
        INFURA: string;
    };
}
export declare function initialize(): Promise<any>;
export declare function getProviders(): any;
export declare const config: Config;
export {};
//# sourceMappingURL=index.d.ts.map