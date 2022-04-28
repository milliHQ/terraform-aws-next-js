import { fetchTimeout } from './fetch-timeout';
import { TTLCache } from './ttl-cache';
import { ProxyConfig } from '../types';

type NodeFetch = typeof import('node-fetch').default;

// Timeout the connection before 30000ms to be able to print an error message
// See Lambda@Edge Limits for origin-request event here:
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-lambda-at-edge
const FETCH_TIMEOUT = 29500;

/**
 * Gets the proxy config from the cache or updates the cache when the item is
 * stale or not in the cache.
 * @param endpointUrl URL where the config should be fetched from
 * @returns Parsed config object
 */
async function fetchProxyConfig(
  fetch: NodeFetch,
  cache: TTLCache<ProxyConfig>,
  endpointUrl: string,
  key: string
): Promise<ProxyConfig | null> {
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
  const url = `http://${endpointUrl}/aliases/${encodeURI(key)}`;
  const response = await fetchTimeout(fetch, FETCH_TIMEOUT, url, etag);

  // 2.1 Existing cache is still valid, update TTL, return cached item
  if (response.status === 304) {
    cache.updateTTL(key);
    return cacheResult!.item;
  }

  // 2.2 Parse the result and save it to the cache
  if (response.status === 200) {
    const parsedItem = (await response.json()) as ProxyConfig;
    // Etag is always present on CloudFront responses
    const responseEtag = response.headers.get('etag')!;
    cache.set(key, { ...parsedItem, etag: responseEtag });
    return parsedItem;
  }

  // 3. Not found
  if (response.status === 404) {
    return null;
  }

  // 4. Other Error
  throw new Error('Failed to fetch from endpoint.');
}

export { fetchProxyConfig };
