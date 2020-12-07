import * as fs from 'fs';
import { URLSearchParams } from 'url';
import { randomBytes } from 'crypto';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { Extract } from 'unzipper';
import { networkInterfaces } from 'os';

/**
 * Generates a random function name for AWS SAM
 * (Because SAM only accepts alphanumeric names)
 */
export function randomServerlessFunctionName() {
  return randomBytes(20).toString('hex');
}

function generateQueryStringParameters(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams);
}

function generateMultiValueQueryStringParameters(
  searchParams: URLSearchParams
) {
  const result: Record<string, string[]> = {};

  for (const [key, value] of searchParams) {
    if (key in result) {
      result[key].push(value);
    } else {
      result[key] = [value];
    }
  }

  return result;
}

interface Payload {
  body?: string;
  httpMethod: 'POST' | 'GET';
  headers: { [key: string]: string };
  path: string;
  searchParams?: URLSearchParams;
}

/**
 * Creates an AWS ApiGateway event
 * @see: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
 */
export function createPayload(payload: Payload) {
  const queryStringParameters = payload.searchParams
    ? generateQueryStringParameters(payload.searchParams)
    : {};
  const multiValueQueryStringParameters = payload.searchParams
    ? generateMultiValueQueryStringParameters(payload.searchParams)
    : {};

  return {
    resource: payload.path,
    path: payload.path,
    headers: payload.headers,
    httpMethod: payload.httpMethod,
    body: payload.body,
    queryStringParameters,
    pathParameters: queryStringParameters,
    multiValueQueryStringParameters,
    isBase64Encoded: false,
  } as APIGatewayProxyEvent;
}

export function unzipToLocation(zipPath: string, location: string) {
  return new Promise<void>((resolve, reject) => {
    // Ensure the dir exists
    fs.mkdirSync(location, { recursive: true });

    // Extract the files to the location
    fs.createReadStream(zipPath)
      .pipe(Extract({ path: location }))
      .on('close', () => resolve())
      .on('error', (err) => reject(err));
  });
}

/**
 * Utility to find the local ip address
 * @see: https://stackoverflow.com/a/8440736/831465
 */
export function getLocalIpAddressFromHost() {
  const nets = networkInterfaces();
  const results: Record<string, Array<string>> = {}; // or just '{}', an empty object

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }

        results[name].push(net.address);
      }
    }
  }

  // Get the first address we find
  for (const [, addresses] of Object.entries(results)) {
    for (const address of addresses) {
      return address;
    }
  }
}

/**
 * Normalizes CloudFront Headers into a simple object
 *
 * input:
 * {
 *    'header-key': [{
 *      key: 'header-key',
 *      value: 'header-value'
 *    }],
 *    ...
 * }
 *
 *
 * output:
 * {
 *   'header-key': 'header-value',
 *   ...
 * }
 */
export function normalizeCloudFrontHeaders(
  input: Record<string, Array<{ key?: string; value: string }>>
) {
  const result: Record<string, string> = {};

  for (const [key, entry] of Object.entries(input)) {
    result[key] = entry[0].value;
  }

  return result;
}
