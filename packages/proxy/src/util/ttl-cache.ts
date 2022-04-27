import { performance } from 'perf_hooks';

/**
 * A minimal TTL cache with focus on performance.
 */
class TTLCache<T> {
  /**
   * The time to life (ttl) for the objects in the data map.
   */
  ttl: number;

  /**
   * Holds the data
   */
  data: Map<string, T>;

  /**
   * Holds the expiration times in ms.
   */
  expirationMap: Map<string, number>;

  /**
   * @param ttl milliseconds until an entry is considered stale.
   */
  constructor(ttl: number) {
    this.ttl = ttl;
    this.data = new Map();
    this.expirationMap = new Map();
  }

  set(key: string, value: T) {
    const time = performance.now();
    const expiration = Math.ceil(time + this.ttl);

    this.expirationMap.set(key, expiration);
    this.data.set(key, value);
  }

  get(key: string): T | undefined {
    const expiration = this.expirationMap.get(key);

    // When no expiration is present, the data is also not present, exit early
    if (expiration === undefined) {
      return undefined;
    }

    // Check if object is already expired
    const time = performance.now();
    if (time > expiration) {
      return undefined;
    }

    return this.data.get(key);
  }
}

export { TTLCache };
