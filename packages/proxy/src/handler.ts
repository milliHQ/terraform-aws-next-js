import { format } from 'util';
import { CloudFrontRequestHandler, CloudFrontHeaders } from 'aws-lambda';
import fetch from 'node-fetch';

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

async function fetchProxyConfig(endpointUri: string) {
  return fetch(endpointUri).then(
    (res) => (res.json() as unknown) as Promise<ProxyConfig>
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
      proxy = new Proxy(proxyConfig.routes);
    }
  } catch (err) {
    console.error(format('Error while initialization: %j', err));
    return request;
  }

  const proxyResult = proxy.route(request.uri);

  // Check if route is served by lambda
  if (proxyConfig.lambdaRoutes.includes(proxyResult.dest)) {
    // Rewrite origin to use api-gateway
    request.origin = {
      custom: {
        domainName: apiEndpoint,
        path: '',
        customHeaders: {},
        keepaliveTimeout: 5,
        port: 443,
        protocol: 'https',
        readTimeout: 5,
        sslProtocols: ['TLSv1.2'],
      },
    };

    // Set Host header to the apiEndpoint
    proxyResult.headers['host'] = apiEndpoint;
  } else if (proxyResult.phase === 'error' && proxyResult.status === 404) {
    // Send 404 directly to S3 bucket for handling without rewrite
    return request;
  }

  // Modify headers
  request.headers = convertToCustomHeaders(
    request.headers,
    proxyResult.headers
  );

  // Rewrite path
  if (!proxyResult.isDestUrl) {
    request.uri = proxyResult.dest;
  }

  return request;
};
