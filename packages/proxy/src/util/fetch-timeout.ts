import fetch, { RequestInit } from 'node-fetch';

// Fetch with timeout
// Promise.race: https://stackoverflow.com/a/49857905/831465
export function fetchTimeout(
  timeout: number,
  url: string,
  fetchOptions?: RequestInit
) {
  return Promise.race([
    fetch(url, fetchOptions),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout while fetching config from ${url}`)),
        timeout
      )
    ),
  ]);
}
