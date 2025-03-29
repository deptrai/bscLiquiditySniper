import { ethers } from 'ethers';

export class HttpProviderPool {
    private providers: ethers.JsonRpcProvider[];
    private currentIndex: number = 0;

    constructor(providers: ethers.JsonRpcProvider[]) {
        this.providers = providers;
    }

    getProvider(): ethers.JsonRpcProvider {
        const provider = this.providers[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
        return provider;
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
    }

    getProvider(): ethers.WebSocketProvider {
        const provider = this.providers[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
        return provider;
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