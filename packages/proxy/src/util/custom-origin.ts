import { URL } from 'url';
import { CloudFrontCustomOrigin } from 'aws-lambda';

/**
 * Converts the input URL into a CloudFront custom origin
 * @param url
 * @returns
 */
export function createCustomOriginFromUrl(
  url: string
): [CloudFrontCustomOrigin, URL] {
  const _url = new URL(url);

  // Protocol
  const protocol = _url.protocol === 'http:' ? 'http' : 'https';

  // Get the correct port
  const port = _url.port
    ? parseInt(_url.port, 10)
    : protocol === 'http'
    ? 80
    : 443;

  return [
    {
      domainName: _url.hostname,
      path: '', // Must not have a tailing / at the end
      customHeaders: {},
      keepaliveTimeout: 5,
      port,
      protocol,
      readTimeout: 30,
      sslProtocols: ['TLSv1.2'],
    },
    _url,
  ];
}

/**
 * Modifies the request that it is served by API Gateway (Lambda)
 *
 * @param apiEndpoint
 * @param path
 * @returns
 */
export function createCustomOriginFromApiGateway(
  apiEndpoint: string,
  path: string
): CloudFrontCustomOrigin {
  return {
    domainName: apiEndpoint,
    path,
    customHeaders: {},
    keepaliveTimeout: 5,
    port: 443,
    protocol: 'https',
    readTimeout: 30,
    sslProtocols: ['TLSv1.2'],
  };
}
