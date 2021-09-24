import {
  CloudFrontHeaders, CloudFrontRequestEvent, CloudFrontResultResponse
} from 'aws-lambda';
import { STATUS_CODES } from 'http';
import { URL } from 'url';
import { Proxy } from './proxy';
import { HTTPHeaders, RouteResult } from './types';
import { createCustomOriginFromApiGateway, createCustomOriginFromUrl } from './util/custom-origin';
import { fetchDeployment } from './util/fetch-deployment';

let proxy: Proxy;

function convertToCloudFrontHeaders(
  initialHeaders: CloudFrontHeaders,
  headers: HTTPHeaders
): CloudFrontHeaders {
  const cloudFrontHeaders: CloudFrontHeaders = { ...initialHeaders };
  for (const key in headers) {
    const lowercaseKey = key.toLowerCase();
    const value = headers[key];

    if (value) {
      cloudFrontHeaders[lowercaseKey] = [{ key, value }];
    }
  }

  return cloudFrontHeaders;
}

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

      // If the redirect is permanent, add caching it
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
        headers: convertToCloudFrontHeaders(headers, routeResult.headers),
      };
    }
  }

  return false;
}

export async function handler(event: CloudFrontRequestEvent) {
  const request = event.Records[0]?.cf.request;

  if (request === undefined) {
    console.error('Could not find any records in CF event.');
    return request;
  }

  const customHeaders = request.origin?.s3?.customHeaders;

  // Custom headers should exist, because we assign them to the CF
  // distribution in the TF code.
  if (customHeaders === undefined) {
    console.error('Could not find custom headers in request.');
    return request;
  }

  const domainName = customHeaders['x-env-domain-name']?.[0]?.value;
  const configEndpoint = customHeaders['x-env-config-endpoint']?.[0]?.value;
  const configTable = customHeaders['x-env-config-table']?.[0]?.value;
  const configRegion = customHeaders['x-env-config-region']?.[0]?.value;
  let apiEndpoint = customHeaders['x-env-api-endpoint']?.[0]?.value;

  if (configEndpoint === undefined || apiEndpoint === undefined) {
    console.error('Could not find required endpoints in custom headers.');
    return request;
  }

  let headers: Record<string, string> = {};
  let deploymentIdentifier = undefined;

  // We need to re-fetch the proxy config for every request, because it could be
  // made to a different deployment than the previous request.
  let deployment = undefined;

  const hostHeader = request.headers.host?.[0]?.value;
  if (hostHeader && domainName && hostHeader !== domainName && hostHeader.endsWith(domainName)) {
    deploymentIdentifier = hostHeader.split('.')[0];

    // Rewrite proxy config path
    const configEndpointURL = new URL(configEndpoint);
    configEndpointURL.pathname = `/${deploymentIdentifier}${configEndpointURL.pathname}`;

    try {
      deployment = await fetchDeployment(
        configEndpointURL.toString(),
        configTable,
        configRegion,
        deploymentIdentifier,
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
      deployment = await fetchDeployment(configEndpoint, configTable, configRegion, ':root:');
    }

    proxy = new Proxy(
      deployment.proxyConfig.routes,
      deployment.proxyConfig.lambdaRoutes,
      deployment.proxyConfig.staticRoutes,
    );
  } catch (err) {
    console.error('Error while initialization:', err);
    return request;
  }

  // Append query string if we have one
  // @see: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
  const requestPath = `${request.uri}${request.querystring !== '' ? `?${request.querystring}` : ''
    }`;

  // Check if we have a prerender route
  // Bypasses proxy
  if (request.uri in deployment.proxyConfig.prerenders) {
    // Modify request to be served from Api Gateway
    const customOrigin = createCustomOriginFromApiGateway(
      apiEndpoint,
      `/${deployment.proxyConfig.prerenders[request.uri]?.lambda}`,
    );
    request.origin = {
      custom: customOrigin,
    };

    // Modify `Host` header to match the external host
    headers.host = apiEndpoint;
  } else {
    // Handle by proxy
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
        proxyResult.dest,
      );
      request.origin = {
        custom: customOrigin,
      };

      // Modify `Host` header to match the external host
      headers.host = apiEndpoint;

      // Append querystring if we have any
      request.querystring = proxyResult.uri_args
        ? proxyResult.uri_args.toString()
        : '';
    } else if (proxyResult.target === 'url') {
      // Modify request to be served from external host
      const [customOrigin, destUrl] = createCustomOriginFromUrl(
        proxyResult.dest
      );
      request.origin = {
        custom: customOrigin,
      };

      // Modify `Host` header to match the external host
      headers.host = customOrigin.domainName;

      // Modify URI to match the path
      request.uri = destUrl.pathname;

      // Append querystring if we have any
      request.querystring = proxyResult.uri_args
        ? proxyResult.uri_args.toString()
        : '';
    } else {
      // Route is served by S3 bucket
      const notFound =
        proxyResult.phase === 'error' && proxyResult.status === 404;

      if (!notFound && proxyResult.found) {
        request.uri = proxyResult.dest;
      }

      // Modify `Host` header to match the S3 host. If the `Host` header is
      // the actual `Host` header we get a `SignatureDoesNotMatch`.
      if (request.origin?.s3?.domainName) {
        headers.host = request.origin?.s3?.domainName;
      }

      // Replace the last / with /index when requesting the resource from S3
      request.uri = request.uri.replace(/\/$/, '/index');

      if (deploymentIdentifier) {
        request.uri = `/${deploymentIdentifier}${request.uri}`;
      }

      // Send 404 directly to S3 bucket for handling without rewrite
      if (notFound) {
        return request;
      }
    }

    headers = { ...proxyResult.headers, ...headers };
  }

  // Modify headers
  request.headers = convertToCloudFrontHeaders(request.headers, headers);

  if (!request.uri) {
    request.uri = '/';
  }

  return request;
}
