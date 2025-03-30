export declare const swapTokens: (tokenIn: string, tokenOut: string, amountIn: string, toAddress: string) => Promise<{
    success: boolean;
    data: any;
    allowance?: undefined;
} | {
    success: boolean;
    data: number;
    allowance: string;
}>;
//# sourceMappingURL=swapTokens.d.ts.map