import { ProviderPool } from '../services/providerPool';
declare function processBlockRange(fromBlock: number, toBlock: number, provider: ProviderPool, dex: string): Promise<void>;
declare function testHistoricalData(args: string[]): Promise<void>;
export { testHistoricalData, processBlockRange };
//# sourceMappingURL=historical.test.d.ts.map