export declare class SnipeService {
    private static instance;
    private router;
    private tokenService;
    private wallet;
    private constructor();
    static getInstance(): SnipeService;
    snipeToken(tokenAddress: string, amountInETH?: string): Promise<any>;
    sellToken(tokenAddress: string, amount: string): Promise<any>;
}
//# sourceMappingURL=snipeService.d.ts.map