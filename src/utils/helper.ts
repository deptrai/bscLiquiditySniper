/**
 * Sleep for a specified number of milliseconds
 * @param ms Number of milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export function formatNumber(value: bigint | number, decimals: number): string {
    if (typeof value === 'number') {
        value = BigInt(Math.floor(value));
    }
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const remainder = value % divisor;
    const decimalStr = remainder.toString().padStart(decimals, '0');
    return `${whole}.${decimalStr}`;
}

export async function findAvailablePort(startPort: number = 3000): Promise<number> {
    const net = require('net');
    
    function isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.once('error', () => {
                resolve(false);
            });
            
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            
            server.listen(port);
        });
    }
    
    let port = startPort;
    while (!(await isPortAvailable(port))) {
        port++;
    }
    
    return port;
} 