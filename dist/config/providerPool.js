"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WssProviderPool = exports.HttpProviderPool = void 0;
class HttpProviderPool {
    constructor(providers) {
        this.currentIndex = 0;
        this.providers = providers;
    }
    getProvider() {
        const provider = this.providers[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
        return provider;
    }
    switchProvider() {
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    }
}
exports.HttpProviderPool = HttpProviderPool;
class WssProviderPool {
    constructor(providers) {
        this.currentIndex = 0;
        this.providers = providers;
    }
    getProvider() {
        const provider = this.providers[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
        return provider;
    }
    switchProvider() {
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    }
}
exports.WssProviderPool = WssProviderPool;
