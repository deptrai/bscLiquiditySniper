declare function testProvider(url: string): Promise<{
    success: boolean;
    blockNumber: number;
    responseTime: number;
    error?: undefined;
} | {
    success: boolean;
    error: unknown;
    blockNumber?: undefined;
    responseTime?: undefined;
}>;
declare function testAllProviders(): Promise<({
    success: boolean;
    blockNumber: number;
    responseTime: number;
    error?: undefined;
} | {
    success: boolean;
    error: unknown;
    blockNumber?: undefined;
    responseTime?: undefined;
})[]>;
export { testProvider, testAllProviders };
//# sourceMappingURL=provider.test.d.ts.map