import {
  CloudFrontHeaders,
  CloudFrontResultResponse,
  CloudFrontRequestEvent,
  CloudFrontRequest,
} from 'aws-lambda';

import { appendQuerystring } from './util/append-querystring';
import { fetchProxyConfig } from './actions/fetch-proxy-config';
import { generateCloudFrontHeaders } from './util/generate-cloudfront-headers';
import {
  createCustomOriginFromApiGateway,
  createCustomOriginFromUrl,
  serveRequestFromCustomOrigin,
  serveRequestFromS3Origin,
} from './util/custom-origin';
import { TTLCache } from './util/ttl-cache';
import { Proxy } from './proxy';
import { ProxyConfig, RouteResult } from './types';
import { renderError } from './error/render-error';
import { MissingConfigError } from './error/missing-config';
import { getEnv } from './util/get-env';

/**
 * We use a custom fetch implementation here that caches DNS resolutions
 * to improve performance for repeated requests.
 */
const fetch = require('@vercel/fetch-cached-dns')(require('node-fetch'));

// TTL in ms
const CACHE_TTL = 60_000;

// Calculating with a
const proxyConfigCache = new TTLCache<ProxyConfig>(CACHE_TTL);
const proxy = new Proxy(fetch);

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
    const redirectTarget = routeResult.headers['Location'];
    if (redirectTarget) {
      // Append the original querystring to the redirect
      const redirectTargetWithQuerystring = routeResult.uri_args
        ? appendQuerystring(redirectTarget, routeResult.uri_args)
        : redirectTarget;

      // Override the Location header value with the appended querystring
      routeResult.headers['Location'] = redirectTargetWithQuerystring;

      // Redirects are not cached, see discussion for details:
      // https://github.com/milliHQ/terraform-aws-next-js/issues/296
      const initialHeaders: CloudFrontHeaders = {
        'cache-control': [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
        'content-type': [
          {
            key: 'Content-Type',
            value: 'text/plain',
          },
        ],
      };

      return {
        status: routeResult.status.toString(),
        headers: generateCloudFrontHeaders(initialHeaders, routeResult.headers),
        body: `Redirecting to ${redirectTargetWithQuerystring} (${routeResult.status})`,
      };
    }
  }

  return false;
}

/**
 * Handler that is called by Lambda@Edge.
 *
 * @param event - Incoming event from CloudFront
 *    @see {@link http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html}
 * @returns CloudFront request or response modified by the proxy.
 */
async function handler(
  event: CloudFrontRequestEvent
): Promise<CloudFrontRequest | CloudFrontResultResponse> {
  /**
   * ! Important !
   * The `request` object should only be modified when the function returns.
   * Changing properties inside of the function may cause unwanted side-effects
   * that are difficult to track.
   */

  try {
    const { request } = event.Records[0].cf;
    const configEndpoint = getEnv(request, 'x-env-config-endpoint');
    const alias = request.headers.host[0].value;
    // TODO: Remove
    const apiEndpoint = '';

    if (!alias) {
      throw new Error('Alias could not be determined from request');
    }

    const proxyConfig = await fetchProxyConfig(
      fetch,
      proxyConfigCache,
      configEndpoint,
      alias
    );

    if (!proxyConfig) {
      throw new MissingConfigError();
    }

    // Check if we have a prerender route
    // Bypasses proxy
    if (request.uri in proxyConfig.prerenders) {
      const customOrigin = createCustomOriginFromApiGateway(
        `/${proxyConfig.prerenders[request.uri].lambda}`,
        proxyConfig.lambdaRoutes
      );
      return serveRequestFromCustomOrigin(request, customOrigin);
    }

    // Handle request by proxy

    // Append query string if we have one
    // @see: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
    const requestPath =
      request.querystring !== ''
        ? `${request.uri}?${request.querystring}`
        : request.uri;
    const proxyResult = await proxy.route(
      proxyConfig.deploymentId,
      proxyConfig.routes,
      proxyConfig.lambdaRoutes,
      configEndpoint,
      requestPath
    );

    // Check for redirect
    const redirect = isRedirect(proxyResult);
    if (redirect) {
      return redirect;
    }

    // Check if route is served by lambda
    if (proxyResult.target === 'lambda') {
      // Modify request to be served from Api Gateway
      const customOrigin = createCustomOriginFromApiGateway(
        proxyResult.dest,
        proxyConfig.lambdaRoutes
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
      const [customOrigin, destUrl] = createCustomOriginFromUrl(
        proxyResult.dest
      );
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
    const notFound =
      proxyResult.phase === 'error' && proxyResult.status === 404;
    const uri = !notFound && proxyResult.found ? proxyResult.dest : undefined;
    return serveRequestFromS3Origin(request, uri);
  } catch (error: any) {
    if (!error.isHandled) {
      // Log full error message to CloudWatch Logs
      console.error(error);
    }

    // Errors that generate its own response
    if (error.toCloudFrontResponse) {
      return error.toCloudFrontResponse();
    }

    // Unhandled error
    return renderError({
      errorCode: 'PROXY_ERROR',
      status: 500,
    });
  }
}

export { handler };
