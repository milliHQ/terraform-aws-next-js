import { format } from 'util';
import { CloudFrontRequestHandler } from 'aws-lambda';
import { Route } from '@vercel/routing-utils';

import { Environment } from './types';
import { Proxy } from './proxy';

let initializationError: any = null;
let routes: Route[];
let lambdaRoutes: Set<string>;
let proxy: Proxy;

try {
  const config = __non_webpack_require__('./environment.json') as Environment;
  routes = config.routes;
  lambdaRoutes = new Set(config.lambdaRoutes);
  proxy = new Proxy(routes);
} catch (err) {
  initializationError = err;
}

export const handler: CloudFrontRequestHandler = async (event) => {
  const { request } = event.Records[0].cf;

  if (initializationError) {
    console.error(
      format('Error while initialization: %j', initializationError)
    );
    return request;
  }

  const proxyResult = proxy.route(request.uri);

  // Check if route is served by lambda
  if (lambdaRoutes.has(proxyResult.dest)) {
    request.origin = {
      custom: {
        domainName: process.env.API_GATEWAY_ENDPOINT,
        path: proxyResult.dest,
        customHeaders: {},
        keepaliveTimeout: 30,
        port: 443,
        protocol: 'https',
        readTimeout: 30,
        sslProtocols: ['TLSv1.2'],
      },
    };
  }

  return request;
};
