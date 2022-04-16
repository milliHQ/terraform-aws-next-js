import { URL, URLSearchParams } from 'url';

import isURL from './is-url';

/**
 * Append a querystring to a relative or absolute URL.
 * Already existing searchParams are not overridden by the new searchParams.
 *
 * @param url The relative or absolute URL
 * @param searchParams The searchParams that should be merged with the input URL
 */
function appendQuerystring(url: string, searchParams: URLSearchParams): string {
  const urlObj = new URL(url, 'https://n');
  const combinedSearchParams = new URLSearchParams({
    ...Object.fromEntries(searchParams),
    ...Object.fromEntries(urlObj.searchParams),
  }).toString();

  if (combinedSearchParams == '') {
    return url;
  }

  if (isURL(url)) {
    urlObj.search = '';
    return `${urlObj.toString()}?${combinedSearchParams}`;
  }

  return `${urlObj.pathname}?${combinedSearchParams}`;
}

export { appendQuerystring };
