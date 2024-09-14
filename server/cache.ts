import { PrevalidatedMap } from "./utils";

const config: { [key in CacheKey]: ConfigValue } = {
    "sph-status": {
        invalidate_after: 1000 * 60 * 5
    }
};

type CacheKey = "sph-status";

interface ConfigValue {
    invalidate_after: number;
}

interface CacheValue {
    value: NonNullable<any>;
    timestamp: number;
}

const cache = new PrevalidatedMap<CacheKey, CacheValue>();

export function getCachedValue<T>(key: CacheKey) {
    if (!cache.has(key)) return null;
    const data = cache.get(key);
    const keyConfig = config[key];
    const now = Date.now();
    if (now - keyConfig.invalidate_after > data.timestamp) {
        cache.delete(key);
        return null;
    }
    return data.value as T;
}

export function storeInCache<T>(key: CacheKey, value: T) {
    // This would also automatically delete the key if the timestamp expired
    if (getCachedValue<T>(key) !== null) return;
    cache.set(key, { value, timestamp: Date.now() });
}

export function getCachedDuration<T>(key: CacheKey) {
    if (!cache.has(key)) return null;
    return Date.now() - cache.get(key).timestamp;
}
