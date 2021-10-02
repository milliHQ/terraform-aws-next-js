import { CloudFrontHeaders } from 'aws-lambda';

import { HTTPHeaders } from '../types';

/**
 * Converts a key value object of headers to the CloudFront format.
 *
 * @param initialHeaders - Headers that are already in the CloudFront format
 *    that should be added to the result.
 * @param headers - Header object in key-value format that should be converted
 *    to CloudFront format. If there is a header with the same key in
 *    `initialHeaders` this will be overridden.
 * @returns Object with headers in CloudFront format (merged `initialHeaders`
 *    and `headers`).
 */
function generateCloudFrontHeaders(
  initialHeaders: CloudFrontHeaders,
  headers: HTTPHeaders
): CloudFrontHeaders {
  const cloudFrontHeaders: CloudFrontHeaders = { ...initialHeaders };
  for (const key in headers) {
    const lowercaseKey = key.toLowerCase();
    cloudFrontHeaders[lowercaseKey] = [{ key, value: headers[key] }];
  }

  return cloudFrontHeaders;
}

export { generateCloudFrontHeaders };
