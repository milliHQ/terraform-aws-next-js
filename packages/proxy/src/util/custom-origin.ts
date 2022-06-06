import { URL } from 'url';

import { CloudFrontCustomOrigin, CloudFrontRequest } from 'aws-lambda';

import { generateCloudFrontHeaders } from './generate-cloudfront-headers';
import { HTTPHeaders } from '../types';

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
      path: '', // Must not have a trailing / at the end
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
  path: string,
  lambdaMapping: Record<string, string>
): CloudFrontCustomOrigin {
  const _url = lambdaMapping[path];

  if (!_url) {
    throw new Error('Lambda does not exist');
  }

  const url = new URL(_url);

  return {
    domainName: url.hostname,
    path,
    customHeaders: {},
    keepaliveTimeout: 5,
    port: 443,
    protocol: 'https',
    readTimeout: 30,
    sslProtocols: ['TLSv1.2'],
  };
}

function serveRequestFromCustomOrigin(
  request: CloudFrontRequest,
  customOrigin: CloudFrontCustomOrigin,
  headers: HTTPHeaders = {},
  querystring?: string,
  uri?: string
): CloudFrontRequest {
  // Change request origin to custom origin
  request.origin = {
    custom: customOrigin,
  };

  const headersToAddToRequest: HTTPHeaders = {
    ...headers,
    host: customOrigin.domainName,
  };

  // If the client has a `Host header defined, forward it as `X-Forwarded-Host`
  // to the origin
  if ('host' in request.headers) {
    headersToAddToRequest['X-Forwarded-Host'] = request.headers.host[0].value;
  }

  // Modify `Host` header to match the external host
  request.headers = generateCloudFrontHeaders(
    request.headers,
    headersToAddToRequest
  );

  // Append querstring if we have one, otherwise set to ''
  if (typeof querystring === 'string') {
    request.querystring = querystring;
  } else {
    request.querystring = '';
  }

  // Change uri if defined
  if (typeof uri === 'string') {
    request.uri = uri;
  }

  return request;
}

/**
 * Modifies a CloudFront response object so that the response gets served by S3.
 *
 * @param request Incoming request from the handler. Gets modified by the
 *                function.
 * @returns Modified request that is served from S3.
 */
function serveRequestFromS3Origin(
  request: CloudFrontRequest,
  uri?: string
): CloudFrontRequest {
  // Modify `Host` header to match the S3 host. If the `Host` header is
  // the actual `Host` header from the client we get a `SignatureDoesNotMatch`.
  if (!request.origin?.s3?.domainName) {
    throw new Error(
      'S3 domain name not present in request.origin.s3.domainName'
    );
  }

  request.headers = generateCloudFrontHeaders(request.headers, {
    host: request.origin.s3.domainName,
  });

  if (typeof uri === 'string') {
    request.uri = uri;
  }

  // Querystring is not supported by S3 origin
  request.querystring = '';

  return request;
}

export { serveRequestFromS3Origin, serveRequestFromCustomOrigin };
