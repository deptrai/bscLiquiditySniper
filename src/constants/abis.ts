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