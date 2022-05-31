/**
 * Key/Value cache where all items with the same eTag are invalidated,
 * when the eTag changes.
 */
class ETagCache<TData> {
  /**
   * Holds the data in the following structure.
   * When the eTag changes, all keys with this eTag are destroyed.
   * {
   *   "eTag": {
   *     "key1": data1,
   *     "key2": data2
   *   }
   * }
   */
  data: Record<string, Record<string, TData>>;
  /**
   * Holds the eTag that is used for storing the.
   */
  eTagMap: Map<string, string>;

  constructor() {
    this.data = {};
    this.eTagMap = new Map();
  }

  set(key: string, value: TData, eTag: string) {
    if (!(eTag in this.data)) {
      this.data[eTag] = {};
    }

    // Get the last eTag that was used to store it
    const lastUsedETag = this.eTagMap.get(key);
    if (lastUsedETag && eTag !== lastUsedETag) {
      // eTag has changed, delete the whole eTag data from the cache
      delete this.data[lastUsedETag];
    }
    this.eTagMap.set(key, eTag);
    this.data[eTag][key] = value;
  }

  get(key: string, eTag: string): TData | undefined {
    if (!(eTag in this.data)) {
      return undefined;
    }

    // Get the last eTag that was used to store it
    const lastUsedETag = this.eTagMap.get(key);
    if (lastUsedETag !== eTag) {
      return undefined;
    }

    return this.data[eTag][key];
  }
}

export { ETagCache };
