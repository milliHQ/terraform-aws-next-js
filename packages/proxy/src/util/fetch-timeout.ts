import fetch, { Response } from 'node-fetch';
import AbortController from 'abort-controller';

/**
 * Fetch with timeout
 * @param timeout Timeout in milliseconds
 * @param url
 * @returns
 */
export async function fetchTimeout(timeout: number, url: string) {
  const controller = new AbortController();
  const timeoutFunc = setTimeout(() => {
    controller.abort();
  }, timeout);

  let error: Error | undefined;
  let fetchResponse: Response | undefined;

  try {
    fetchResponse = await fetch(url, { signal: controller.signal });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      error = new Error(`Timeout while fetching config from ${url}`);
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
