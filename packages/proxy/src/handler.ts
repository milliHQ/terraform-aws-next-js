import { CloudFrontRequestHandler, CloudFrontHeaders } from 'aws-lambda';
import fetch, { RequestInit } from 'node-fetch';

import { ProxyConfig, HTTPHeaders } from './types';
import { Proxy } from './proxy';

let proxyConfig: ProxyConfig;
let proxy: Proxy;

function convertToCustomHeaders(
  initialHeaders: CloudFrontHeaders = {},
  headers: HTTPHeaders
): CloudFrontHeaders {
  const cloudFrontHeaders: CloudFrontHeaders = { ...initialHeaders };
  for (const [key, value] of Object.entries(headers)) {
    cloudFrontHeaders[key] = [{ key, value }];
  }

  return cloudFrontHeaders;
}

// Timeout the connection before 30000ms to be able to print an error message
// See Lambda@Edge Limits for origin-request event here:
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html#lambda-requirements-see-limits
// Promise.race: https://stackoverflow.com/a/49857905/831465
function fetchTimeout(url: string, options?: RequestInit, timeout = 29500) {
  return Promise.race([
    fetch(url, options),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout while fetching config from ${url}`)),
        timeout
      )
    ),
  ]);
}

async function fetchProxyConfig(endpointUri: string) {
  return fetchTimeout(endpointUri).then(
    (res) => res.json() as Promise<ProxyConfig>
  );
}

export const handler: CloudFrontRequestHandler = async (event) => {
  const { request } = event.Records[0].cf;
  const configEndpoint = request.origin!.s3!.customHeaders[
    'x-env-config-endpoint'
  ][0].value;
  const apiEndpoint = request.origin!.s3!.customHeaders['x-env-api-endpoint'][0]
    .value;

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
  const proxyResult = proxy.route(requestPath);

  // Check if route is served by lambda
  if (proxyConfig.lambdaRoutes.includes(proxyResult.dest)) {
    // Rewrite origin to use api-gateway
    request.origin = {
      custom: {
        domainName: apiEndpoint,
        path: proxyResult.dest,
        customHeaders: {},
        keepaliveTimeout: 5,
        port: 443,
        protocol: 'https',
        readTimeout: 5,
        sslProtocols: ['TLSv1.2'],
      },
    };

    request.querystring = proxyResult.uri_args
      ? proxyResult.uri_args.toString()
      : '';

    // Set Host header to the apiEndpoint
    proxyResult.headers['host'] = apiEndpoint;
  } else if (proxyResult.phase === 'error' && proxyResult.status === 404) {
    // Send 404 directly to S3 bucket for handling without rewrite
    return request;
  } else {
    // Route is served by S3 bucket
    if (proxyResult.found) {
      request.uri = proxyResult.dest;
    }
  }

  // Modify headers
  request.headers = convertToCustomHeaders(
    request.headers,
    proxyResult.headers
  );

  if (!request.uri) {
    request.uri = '/';
  }

  return request;
};
