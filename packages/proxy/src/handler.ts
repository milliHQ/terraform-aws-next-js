import { STATUS_CODES } from 'http';
import {
  CloudFrontHeaders,
  CloudFrontResultResponse,
  CloudFrontRequestEvent,
  CloudFrontRequest,
} from 'aws-lambda';

import { fetchProxyConfig } from './util/fetch-proxy-config';
import { generateCloudFrontHeaders } from './util/generate-cloudfront-headers';
import { ProxyConfig, RouteResult } from './types';
import { Proxy } from './proxy';
import {
  createCustomOriginFromApiGateway,
  createCustomOriginFromUrl,
  serveRequestFromCustomOrigin,
  serveRequestFromS3Origin,
} from './util/custom-origin';

let proxyConfig: ProxyConfig;
let proxy: Proxy;

/**
 * Checks if a route result issued a redirect
 */
function isRedirect(
  routeResult: RouteResult
): false | CloudFrontResultResponse {
  if (
    routeResult.status &&
    routeResult.status >= 300 &&
    routeResult.status <= 309
  ) {
    if ('Location' in routeResult.headers) {
      let headers: CloudFrontHeaders = {};

      // If the redirect is permanent, cache the result
      if (routeResult.status === 301 || routeResult.status === 308) {
        headers['cache-control'] = [
          {
            key: 'Cache-Control',
            value: 'public,max-age=31536000,immutable',
          },
        ];
      }

      return {
        status: routeResult.status.toString(),
        statusDescription: STATUS_CODES[routeResult.status],
        headers: generateCloudFrontHeaders(headers, routeResult.headers),
      };
    }
  }

  return false;
}

/**
 * Internal handler that is called by the handler.
 *
 * @param event - Incoming event from CloudFront
 *    @see {@link http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html}
 * @returns CloudFront request or response modified by the proxy.
 */
async function main(
  event: CloudFrontRequestEvent
): Promise<CloudFrontRequest | CloudFrontResultResponse> {
  /**
   * ! Important !
   * The `request` object should only be modified when the function returns.
   * Changing properties inside of the function may cause unwanted side-effects
   * that are difficult to track.
   */
  const { request } = event.Records[0].cf;
  const configEndpoint = request.origin!.s3!.customHeaders[
    'x-env-config-endpoint'
  ][0].value;
  const apiEndpoint = request.origin!.s3!.customHeaders['x-env-api-endpoint'][0]
    .value;
  let headers: Record<string, string> = {};

  try {
    if (!proxyConfig) {
      proxyConfig = await fetchProxyConfig(configEndpoint);
      proxy = new Proxy(
        proxyConfig.routes,
        proxyConfig.lambdaRoutes,
        proxyConfig.staticRoutes
      );
    }
  } catch (err) {
    console.error('Error while initialization:', err);
    return serveRequestFromS3Origin(request);
  }

  // Check if we have a prerender route
  // Bypasses proxy
  if (request.uri in proxyConfig.prerenders) {
    const customOrigin = createCustomOriginFromApiGateway(
      apiEndpoint,
      `/${proxyConfig.prerenders[request.uri].lambda}`
    );
    return serveRequestFromCustomOrigin(request, customOrigin);
  }

  // Handle request by proxy

  // Append query string if we have one
  // @see: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
  const requestPath = `${request.uri}${
    request.querystring !== '' ? `?${request.querystring}` : ''
  }`;
  const proxyResult = proxy.route(requestPath);

  // Check for redirect
  const redirect = isRedirect(proxyResult);
  if (redirect) {
    return redirect;
  }

  // Check if route is served by lambda
  if (proxyResult.target === 'lambda') {
    // Modify request to be served from Api Gateway
    const customOrigin = createCustomOriginFromApiGateway(
      apiEndpoint,
      proxyResult.dest
    );

    // Append querystring if we have any
    const querystring = proxyResult.uri_args
      ? proxyResult.uri_args.toString()
      : '';

    return serveRequestFromCustomOrigin(
      request,
      customOrigin,
      proxyResult.headers,
      querystring
    );
  }

  if (proxyResult.target === 'url') {
    // Modify request to be served from external host
    const [customOrigin, destUrl] = createCustomOriginFromUrl(proxyResult.dest);
    // Modify URI to match the path
    const uri = destUrl.pathname;

    // Append querystring if we have any
    const querystring = proxyResult.uri_args
      ? proxyResult.uri_args.toString()
      : '';

    return serveRequestFromCustomOrigin(
      request,
      customOrigin,
      proxyResult.headers,
      querystring,
      uri
    );
  }

  // Route is served by S3 bucket
  const notFound = proxyResult.phase === 'error' && proxyResult.status === 404;
  const uri = !notFound && proxyResult.found ? proxyResult.dest : undefined;
  return serveRequestFromS3Origin(request, uri);
}

/**
 * Handler that is called by Lambda@Edge.
 *
 * @param event - Incoming event from CloudFront
 *    @see {@link http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html}
 * @returns CloudFront request or response modified by the proxy.
 */
export async function handler(
  event: CloudFrontRequestEvent
): Promise<CloudFrontRequest | CloudFrontResultResponse> {
  try {
    return main(event);
  } catch (error) {
    // Something went terribly wrong - Should never be called!
    console.error('Unexpected error occurred: ', error);
    return event.Records[0].cf.request;
  }
}
