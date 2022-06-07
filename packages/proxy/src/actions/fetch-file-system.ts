import { TTLCache } from '../util/ttl-cache';
import { FileSystemEntry } from '../types';
import { fetchCached } from './fetch-cached';

type NodeFetch = typeof import('node-fetch').default;

/**
 * Checks if a file exits in the fileSystem.
 *
 * @param fetch
 * @param cache
 * @param endpointUrl
 * @param deploymentId
 * @param filePath
 * @returns
 */
function fetchFileSystem(
  fetch: NodeFetch,
  cache: TTLCache<FileSystemEntry>,
  endpointUrl: string,
  deploymentId: string,
  filePath: string
): Promise<FileSystemEntry | null> {
  const url = `${endpointUrl}/filesystem/${deploymentId}/${filePath}`;
  const cacheKey = deploymentId + filePath;
  return fetchCached(fetch, cache, url, cacheKey);
}

export { fetchFileSystem };
