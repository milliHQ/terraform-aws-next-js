import { URL } from 'url';
import { STATUS_CODES } from 'http';

import {
  CloudFrontHeaders,
  CloudFrontRequest,
  CloudFrontRequestEvent,
  CloudFrontResultResponse,
} from 'aws-lambda';

import { fetchDeployment } from './util/fetch-deployment';
import { generateCloudFrontHeaders } from './util/generate-cloudfront-headers';
import {
  createCustomOriginFromApiGateway,
  createCustomOriginFromUrl,
  serveRequestFromCustomOrigin,
  serveRequestFromS3Origin,
} from './util/custom-origin';
import { Proxy } from './proxy';
import { RouteResult } from './types';

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
      const headers: CloudFrontHeaders = {};

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
  const request = event.Records[0]?.cf.request;
  if (request === undefined) {
    throw new Error('Could not find any records in CF event.');
  }

  // Custom headers should exist, because we assign them to the CF
  // distribution in the TF code.
  const customHeaders = request.origin?.s3?.customHeaders;
  if (customHeaders === undefined) {
    throw new Error('Could not find custom headers in request.');
  }

  const domainName = customHeaders['x-env-domain-name']?.[0]?.value;
  const configEndpoint = customHeaders['x-env-config-endpoint']?.[0]?.value;
  const configTable = customHeaders['x-env-config-table']?.[0]?.value;
  const configRegion = customHeaders['x-env-config-region']?.[0]?.value;
  let apiEndpoint = customHeaders['x-env-api-endpoint']?.[0]?.value;

  if (configEndpoint === undefined || apiEndpoint === undefined) {
    throw new Error('Could not find required endpoints in custom headers.');
  }

  let deploymentIdentifier = undefined;

  // We need to re-fetch the proxy config for every request, because it could be
  // made to a different deployment than the previous request.
  let deployment = undefined;

  const hostHeader = request.headers.host?.[0]?.value;
  if (
    hostHeader &&
    domainName &&
    hostHeader !== domainName &&
    hostHeader.endsWith(domainName)
  ) {
    deploymentIdentifier = hostHeader.split('.')[0];

    // Rewrite proxy config path
    const configEndpointURL = new URL(configEndpoint);
    configEndpointURL.pathname = `/${deploymentIdentifier}${configEndpointURL.pathname}`;

    try {
      deployment = await fetchDeployment(
        configEndpointURL.toString(),
        configTable,
        configRegion,
        deploymentIdentifier
      );
      if (deployment && deployment.aliasedTo) {
        deploymentIdentifier = deployment.aliasedTo;
      }
    } catch (err) {
      console.log(
        `Did not find proxy configuration for deployment ${deploymentIdentifier}. ` +
          'Retrying with default proxy configuration.'
      );
    }

    // Rewrite API endpoint
    if (deployment?.proxyConfig?.apiId) {
      const parts = apiEndpoint.split('.');
      apiEndpoint = [deployment.proxyConfig.apiId, ...parts.slice(1)].join('.');
    }
  }

  try {
    // If we haven't fetched the proxy config for a deployment identifier yet,
    // fetch the default here.
    if (!deployment) {
      deployment = await fetchDeployment(
        configEndpoint,
        configTable,
        configRegion,
        ':root:'
      );
    }

    proxy = new Proxy(
      deployment.proxyConfig.routes,
      deployment.proxyConfig.lambdaRoutes,
      deployment.proxyConfig.staticRoutes
    );
  } catch (err) {
    console.error('Error while initialization:', err);
    return serveRequestFromS3Origin(request);
  }

  // Check if we have a prerender route
  // Bypasses proxy
  if (request.uri in deployment.proxyConfig.prerenders) {
    const customOrigin = createCustomOriginFromApiGateway(
      apiEndpoint,
      `/${deployment.proxyConfig.prerenders[request.uri]?.lambda}`
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
  let uri = !notFound && proxyResult.found ? proxyResult.dest : undefined;

  // Prefix S3 path with deploymentIdentifier
  if (deploymentIdentifier) {
    uri = `/${deploymentIdentifier}${uri}`;
  }

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
    return event.Records[0]!.cf.request;
  }
}
