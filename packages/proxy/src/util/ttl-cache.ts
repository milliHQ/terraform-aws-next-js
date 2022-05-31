// performance.now is slightly faster than Date.now on Node.js from my
// benchmarks
import { performance } from 'perf_hooks';

/**
 * A minimal TTL cache with focus on performance.
 * Expired items are only purged from cache during set operation.
 * Get operation does not modify the cache, so that get is usually more
 * performant than set.
 */
class TTLCache<T> {
  /**
   * The minimum time to life (TTL) for the objects in the data map.
   */
  minTTL: number;
  /**
   * Holds the data
   */
  data: Map<string, T>;
  /**
   * Holds the expiration times in ms.
   */
  expirationMap: Map<string, number>;
  /**
   * List of all expirations
   */
  expirations: Record<number, string[]>;

  /**
   * @param ttl milliseconds until an entry is considered stale.
   */
  constructor(minTTL: number) {
    this.minTTL = minTTL;
    this.data = new Map();
    this.expirationMap = new Map();
    this.expirations = Object.create(null);
  }

  set(key: string, value: T, ttl: number = 0) {
    const minTTL = Math.max(this.minTTL, ttl);
    const time = performance.now();

    // Purge expired items from cache
    this.purgeStale(time);

    const expiration = Math.ceil(time + minTTL);

    // Set the data
    this.expirationMap.set(key, expiration);
    this.data.set(key, value);

    // Update the expiration table
    if (!this.expirations[expiration]) {
      this.expirations[expiration] = [key];
    } else {
      this.expirations[expiration].push(key);
    }
  }

  get(key: string): {
    expired: boolean;
    item: T;
  } | null {
    const expiration = this.expirationMap.get(key);

    // When no expiration is present, the data is also not present, exit early
    if (expiration === undefined) {
      return null;
    }

    // Check if object is already expired
    const time = performance.now();
    const expired = time > expiration;

    return {
      expired,
      item: this.data.get(key)!,
    };
  }

  /**
   * Purges stale items from cache
   * @param time
   * @returns
   */
  purgeStale(time: number) {
    for (const exp in this.expirations) {
      // List goes from low -> high, so when the time exceeds we don't have
      // to check items that came after.
      if (Number(exp) > time) {
        return;
      }

      for (const key of this.expirations[exp]) {
        this.data.delete(key);
        this.expirationMap.delete(key);
      }
      delete this.expirations[exp];
    }
  }

  /**
   * Update the TTL of an existing item in the cache
   * @param key
   */
  updateTTL(key: string, ttl: number = 0) {
    const minTTL = Math.max(this.minTTL, ttl);
    const oldExpiration = this.expirationMap.get(key);

    if (oldExpiration) {
      const newExpiration = Math.ceil(performance.now() + minTTL);
      this.expirationMap.set(key, newExpiration);
      this.expirations[oldExpiration] = this.expirations[oldExpiration].filter(
        (item) => item !== key
      );
    }
  }
}

export { TTLCache };
