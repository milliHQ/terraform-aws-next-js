import { STATUS_CODES } from 'http';
import {
  CloudFrontRequestHandler,
  CloudFrontHeaders,
  CloudFrontRequest,
  CloudFrontResultResponse,
} from 'aws-lambda';

import {
  ProxyConfig,
  HTTPHeaders,
  ApiGatewayOriginProps,
  RouteResult,
} from './types';
import { Proxy } from './proxy';
import { fetchTimeout } from './util/fetch-timeout';

let proxyConfig: ProxyConfig;
let proxy: Proxy;

function convertToCloudFrontHeaders(
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

async function fetchProxyConfig(endpointUri: string) {
  // Timeout the connection before 30000ms to be able to print an error message
  // See Lambda@Edge Limits for origin-request event here:
  // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html#lambda-requirements-see-limits
  return fetchTimeout(29500, endpointUri).then(
    (res) => res.json() as Promise<ProxyConfig>
  );
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
      let headers: CloudFrontHeaders = {};

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

/**
 * Modifies the request that it is served by API Gateway (Lambda)
 */
function serveFromApiGateway(
  request: CloudFrontRequest,
  apiEndpoint: string,
  { path }: ApiGatewayOriginProps
) {
  request.origin = {
    custom: {
      domainName: apiEndpoint,
      path,
      customHeaders: {},
      keepaliveTimeout: 5,
      port: 443,
      protocol: 'https',
      readTimeout: 30,
      sslProtocols: ['TLSv1.2'],
    },
  };

  // Set Host header to the apiEndpoint
  return {
    host: apiEndpoint,
  };
}

export const handler: CloudFrontRequestHandler = async (event) => {
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
    return request;
  }

  // Append query string if we have one
  // @see: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
  const requestPath = `${request.uri}${
    request.querystring !== '' ? `?${request.querystring}` : ''
  }`;

  // Check if we have a prerender route
  // Bypasses proxy
  if (request.uri in proxyConfig.prerenders) {
    headers = serveFromApiGateway(request, apiEndpoint, {
      path: `/${proxyConfig.prerenders[request.uri].lambda}`,
    });
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
      headers = serveFromApiGateway(request, apiEndpoint, {
        path: proxyResult.dest,
      });

      request.querystring = proxyResult.uri_args
        ? proxyResult.uri_args.toString()
        : '';
    } else if (proxyResult.phase === 'error' && proxyResult.status === 404) {
      // Send 404 directly to S3 bucket for handling without rewrite
      return request;
    } else {
      // Route is served by S3 bucket
      if (proxyResult.found) {
        request.uri = proxyResult.dest;
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
};
