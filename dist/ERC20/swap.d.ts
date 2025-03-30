export declare function initializeProvider(): void;
export declare const getTokenBalance: (tokenAddress: string, wallet: string) => Promise<{
    success: boolean;
    data: any;
}>;
export declare const getAmountsOut: (amountIn: string, path: string[]) => Promise<any>;
export declare const getWalletNonce: (wallet: string) => Promise<{
    success: boolean;
    data: number;
}>;
export declare const getAllowance: (token: string) => Promise<string>;
export declare const approveAllowance: (token: string) => Promise<{
    success: boolean;
    data: any;
}>;
export declare const swapToken: (amountIn: string, amountOutMin: string, path: string[], to: string, deadline: number, overloads?: any) => Promise<{
    success: boolean;
    data: any;
}>;
export declare const swapETHforToken: (amountOutMin: string, path: string[], to: string, amountIn: string, overloads?: any) => Promise<{
    success: boolean;
    data: any;
}>;
export declare const swapTokenForETH: (amountIn: string, amountOutMin: string, path: string[], to: string, deadline: number, overloads?: any) => Promise<{
    success: boolean;
    data: any;
}>;
//# sourceMappingURL=swap.d.ts.map