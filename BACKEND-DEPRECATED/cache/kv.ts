import { Memento } from 'vscode';

interface CacheOptions {
    maxSize?: number;
    defaultTTL?: number;
}

interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl?: number;
}

export class KVCache<T> {
    private storage: Memento;
    private maxSize: number;
    private defaultTTL: number;

    constructor(storage: Memento, options: CacheOptions = {}) {
        this.storage = storage;
        this.maxSize = options.maxSize || 1000;
        this.defaultTTL = options.defaultTTL || 3600000; // 1 hour in milliseconds
    }

    async get(key: string): Promise<T | undefined> {
        const entry = await this.storage.get<CacheEntry<T>>(key);
        if (!entry) return undefined;

        if (this.isExpired(entry)) {
            await this.delete(key);
            return undefined;
        }

        return entry.value;
    }

    async set(key: string, value: T, ttl?: number): Promise<void> {
        const entry: CacheEntry<T> = {
            value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        };

        await this.storage.update(key, entry);
        await this.enforceMaxSize();
    }

    async delete(key: string): Promise<void> {
        await this.storage.update(key, undefined);
    }

    async clear(): Promise<void> {
        // Get all keys and delete them
        const keys = await this.getAllKeys();
        for (const key of keys) {
            await this.delete(key);
        }
    }

    private async getAllKeys(): Promise<string[]> {
        const keys: string[] = [];
        const entries = await this.storage.keys();
        return entries;
    }

    private isExpired(entry: CacheEntry<T>): boolean {
        if (!entry.ttl) return false;
        const age = Date.now() - entry.timestamp;
        return age > entry.ttl;
    }

    private async enforceMaxSize(): Promise<void> {
        const keys = await this.getAllKeys();
        if (keys.length <= this.maxSize) return;

        // Remove oldest entries until we're under maxSize
        const entriesToRemove = keys.length - this.maxSize;
        const entries = await Promise.all(
            keys.map(async (key) => ({
                key,
                entry: await this.storage.get<CacheEntry<T>>(key)
            }))
        );

        // Sort by timestamp (oldest first) and remove excess entries
        entries
            .sort((a, b) => (a.entry?.timestamp || 0) - (b.entry?.timestamp || 0))
            .slice(0, entriesToRemove)
            .forEach(async ({ key }) => {
                await this.delete(key);
            });
    }
} 