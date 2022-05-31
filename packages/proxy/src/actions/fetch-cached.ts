import { fetchTimeout } from '../util/fetch-timeout';
import { TTLCache } from '../util/ttl-cache';

type NodeFetch = typeof import('node-fetch').default;

// Timeout the connection before 30000ms to be able to print an error message
// See Lambda@Edge Limits for origin-request event here:
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-lambda-at-edge
const FETCH_TIMEOUT = 29500;

/**
 * Gets items from the cache or updates the cache when the item is
 * stale or not in the cache.
 *
 * @param fetch - Fetch library to use
 * @param cache - TTL cache to use
 * @param url - URL for revalidating stale / fetching uncached items
 * @key key - Key that is used to store the item in cache
 * @returns Parsed item
 */
async function fetchCached<Data extends { etag: string }>(
  fetch: NodeFetch,
  cache: TTLCache<Data>,
  url: string,
  key: string
): Promise<Data | null> {
  let etag: string | undefined;

  // 1. Check cache for existing item
  const cacheResult = cache.get(key);

  if (cacheResult !== null) {
    // 1.1 Item is in cache and not stale
    if (!cacheResult.expired) {
      return cacheResult.item;
    }

    // 1.2 Item is in cache but is stale, then set etag
    etag = cacheResult.item.etag;
  }

  // 2. Revalidate cache from proxy config endpoint
  const response = await fetchTimeout(fetch, FETCH_TIMEOUT, url, etag);

  // 2.1 Existing cache is still valid, update TTL, return cached item
  if (response.status === 304) {
    cache.updateTTL(key);
    return cacheResult!.item;
  }

  // 2.2 Parse the result and save it to the cache
  if (response.status === 200) {
    const parsedItem = (await response.json()) as Data;
    // Etag is always present on CloudFront responses
    const responseEtag = response.headers.get('etag')!;
    parsedItem.etag = responseEtag;
    cache.set(key, parsedItem);
    return parsedItem;
  }

  // 3. Not found
  if (response.status === 404) {
    return null;
  }

  // 4. Other Error
  throw new Error('Failed to fetch from endpoint.');
}

export { fetchCached };
