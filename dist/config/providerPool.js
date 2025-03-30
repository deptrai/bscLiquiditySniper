"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WssProviderPool = exports.HttpProviderPool = void 0;
class HttpProviderPool {
    constructor(providers) {
        this.currentIndex = 0;
        this.providers = providers;
        // Start with the first provider
        this.currentIndex = 0;
    }
    getProvider() {
        return this.providers[this.currentIndex];
    }
    switchProvider() {
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    }
    getCurrentProviderIndex() {
        return this.currentIndex;
    }
    getProviderCount() {
        return this.providers.length;
    }
}
exports.HttpProviderPool = HttpProviderPool;
class WssProviderPool {
    constructor(providers) {
        this.currentIndex = 0;
        this.providers = providers;
        // Start with the first provider
        this.currentIndex = 0;
    }
    getProvider() {
        return this.providers[this.currentIndex];
    }
    switchProvider() {
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    }
    getCurrentProviderIndex() {
        return this.currentIndex;
    }
    getProviderCount() {
        return this.providers.length;
    }
}
exports.WssProviderPool = WssProviderPool;
//# sourceMappingURL=providerPool.js.map