export const PAIR_ABI = [
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function totalSupply() external view returns (uint)',
    'function balanceOf(address owner) external view returns (uint)',
    'function allowance(address owner, address spender) external view returns (uint)',
    'function approve(address spender, uint value) external returns (bool)',
    'function transfer(address to, uint value) external returns (bool)',
    'function transferFrom(address from, address to, uint value) external returns (bool)',
    'function DOMAIN_SEPARATOR() external view returns (bytes32)',
    'function PERMIT_TYPEHASH() external pure returns (bytes32)',
    'function nonces(address owner) external view returns (uint)',
    'function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external'
];

export const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
    'function buyTax() view returns (uint256)',
    'function sellTax() view returns (uint256)',
    'function reflectionFee() view returns (uint256)',
    'function maxTransactionAmount() view returns (uint256)',
    'function maxWalletAmount() view returns (uint256)',
    'function cooldownTime() view returns (uint256)',
    'function isBlacklisted(address) view returns (bool)',
    'function isWhitelisted(address) view returns (bool)',
    'function burnAddress() view returns (address)',
    'function burnRate() view returns (uint256)',
    'function totalBurned() view returns (uint256)'
];

export const LOCK_ABI = [
    'function getLockInfo(address pair) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByIndex(uint256 index) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockCount() view returns (uint256)',
    'function getLockCountByPair(address pair) view returns (uint256)',
    'function getLockInfoByPairAndIndex(address pair, uint256 index) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByToken(address token) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByTokenAndIndex(address token, uint256 index) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByTokenAndPair(address token, address pair) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByTokenAndPairAndIndex(address token, address pair, uint256 index) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByOwner(address owner) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByOwnerAndIndex(address owner, uint256 index) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByOwnerAndToken(address owner, address token) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByOwnerAndTokenAndIndex(address owner, address token, uint256 index) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByOwnerAndPair(address owner, address pair) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByOwnerAndPairAndIndex(address owner, address pair, uint256 index) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByOwnerAndTokenAndPair(address owner, address token, address pair) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))',
    'function getLockInfoByOwnerAndTokenAndPairAndIndex(address owner, address token, address pair, uint256 index) view returns (tuple(address owner, uint256 amount, uint256 percentage, uint256 startTime, uint256 endTime))'
];

// Event signatures
export const EVENT_SIGNATURES = {
    // Existing events
    PAIR_CREATED: 'PairCreated(address,address,address,uint256)',
    POOL_CREATED: 'PoolCreated(address,address,uint24,uint24,address)',
    
    // New events
    TRANSFER: 'Transfer(address,address,uint256)',
    SWAP: 'Swap(address,uint256,uint256,uint256,uint256,address)',
    MINT: 'Mint(address,uint256,uint256)',
    BURN: 'Burn(address,uint256,uint256,address)',
    ADD_LIQUIDITY: 'AddLiquidity(address,uint256,uint256,uint256,uint256)',
    REMOVE_LIQUIDITY: 'RemoveLiquidity(address,uint256,uint256,uint256,uint256)'
}; 