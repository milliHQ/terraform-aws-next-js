import AbortController from 'abort-controller';
import { RequestInit, Response } from 'node-fetch';

type NodeFetch = typeof import('node-fetch').default;

/**
 * Fetch with timeout
 * @param timeout Timeout in milliseconds
 * @param url
 * @param etag
 * @returns
 */
export async function fetchTimeout(
  fetch: NodeFetch,
  timeout: number,
  url: string,
  etag?: string
) {
  const controller = new AbortController();
  const timeoutFunc = setTimeout(() => {
    controller.abort();
  }, timeout);

  let error: Error | undefined;
  let fetchResponse: Response | undefined;

  const params: RequestInit = { signal: controller.signal };

  // Apply If-None-Match header if etag is present
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match
  if (etag) {
    params.headers = {
      'If-None-Match': `"${etag}"`,
    };
  }

  try {
    fetchResponse = await fetch(url, params);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      error = new Error(`Timeout while fetching from ${url}`);
    } else {
      error = err;
    }
  } finally {
    clearTimeout(timeoutFunc);
  }

  if (error) {
    throw error;
  }

  return fetchResponse!;
}
