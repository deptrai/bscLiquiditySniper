import { ethers } from 'ethers';

export class HttpProviderPool {
    private providers: ethers.JsonRpcProvider[];
    private currentIndex: number = 0;

    constructor(providers: ethers.JsonRpcProvider[]) {
        this.providers = providers;
        // Start with the first provider
        this.currentIndex = 0;
    }

    getProvider(): ethers.JsonRpcProvider {
        return this.providers[this.currentIndex];
    }

    switchProvider() {
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    }

    getCurrentProviderIndex(): number {
        return this.currentIndex;
    }

    getProviderCount(): number {
        return this.providers.length;
    }
}

export class WssProviderPool {
    private providers: ethers.WebSocketProvider[];
    private currentIndex: number = 0;

    constructor(providers: ethers.WebSocketProvider[]) {
        this.providers = providers;
        // Start with the first provider
        this.currentIndex = 0;
    }

    getProvider(): ethers.WebSocketProvider {
        return this.providers[this.currentIndex];
    }

    switchProvider() {
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    }

    getCurrentProviderIndex(): number {
        return this.currentIndex;
    }

    getProviderCount(): number {
        return this.providers.length;
    }
} 