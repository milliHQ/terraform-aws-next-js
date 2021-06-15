import { fetchTimeout } from './fetch-timeout';
import { ProxyConfig } from '../types';

// Timeout the connection before 30000ms to be able to print an error message
// See Lambda@Edge Limits for origin-request event here:
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html#lambda-requirements-see-limits
const FETCH_TIMEOUT = 29500;

/**
 * Retrieves and parses the config object for the proxy over HTTP.
 * @param endpointUrl URL where the config should be fetched from
 * @returns Parsed config object
 */
export function fetchProxyConfig(endpointUrl: string) {
  return fetchTimeout(FETCH_TIMEOUT, endpointUrl).then(
    (res) => res.json() as Promise<ProxyConfig>
  );
}
