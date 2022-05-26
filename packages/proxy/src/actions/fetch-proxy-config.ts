import { TTLCache } from '../util/ttl-cache';
import { ProxyConfig } from '../types';
import { fetchCached } from './fetch-cached';

type NodeFetch = typeof import('node-fetch').default;

/**
 * Gets the proxy config from the cache or updates the cache when the item is
 * stale or not in the cache.
 *
 * @param endpointUrl - URL where the config should be fetched from
 * @returns Parsed config object
 */
function fetchProxyConfig(
  fetch: NodeFetch,
  cache: TTLCache<ProxyConfig>,
  endpointUrl: string,
  key: string
): Promise<ProxyConfig | null> {
  const url = `${endpointUrl}/aliases/${encodeURI(key)}`;
  return fetchCached(fetch, cache, url, key);
}

export { fetchProxyConfig };
