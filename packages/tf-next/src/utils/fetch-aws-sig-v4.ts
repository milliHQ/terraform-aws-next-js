import { URL } from 'url';

import { Sha256 } from '@aws-crypto/sha256-js';
import { fromIni } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HeaderBag } from '@aws-sdk/types';
import nodeFetch, { HeadersInit } from 'node-fetch';

type NodeFetch = typeof nodeFetch;

/**
 * API Gateway endpoints use a regional API endpoint which includes the AWS
 * region where they are deployed to.
 * E.g. https://xyz.execute-api.eu-central-1.amazonaws.com
 */
function extractRegionFromApiGatewayEndpoint(
  endpointUrl: string
): string | null {
  const result = endpointUrl.match(/execute-api\.([^\.]*)/);

  if (result && result[1]) {
    return result[1];
  }

  return null;
}

/**
 * Converts the headers from fetch into SignatureV4 compatible format.
 */
function convertFetchHeaders(
  inputHeaders: HeadersInit | undefined = {}
): HeaderBag {
  const result: HeaderBag = {};

  for (const [key, value] of Object.entries(inputHeaders)) {
    result[key] = value;
  }

  return result;
}

type FetchAWSSigV4Options = {
  /**
   * API endpoint to use (Should use API Signature V4 for authorization)
   */
  apiEndpoint: string;
  /**
   * AWS profile to use for the credential generation.
   */
  profile?: string;
};

async function fetchAWSSigV4(
  { apiEndpoint, profile }: FetchAWSSigV4Options,
  ...fetchArgs: Parameters<NodeFetch>
) {
  const region = extractRegionFromApiGatewayEndpoint(apiEndpoint);
  if (!region) {
    throw new Error('Could not extract AWS region from API Gateway endpoint.');
  }

  const credentialProvider = fromIni({ profile });
  const signature = new SignatureV4({
    region: region,
    service: 'execute-api',
    credentials: credentialProvider,
    sha256: Sha256,
  });

  let requestUrl: string;
  if (typeof fetchArgs[0] === 'string') {
    requestUrl = fetchArgs[0];
  } else if ('href' in fetchArgs[0]) {
    requestUrl = fetchArgs[0].href;
  } else {
    requestUrl = fetchArgs[0].url;
  }

  const parsedUrl = new URL(requestUrl, apiEndpoint);
  const signedRequest = await signature.sign({
    hostname: parsedUrl.hostname,
    protocol: parsedUrl.protocol,
    path: parsedUrl.pathname,
    headers: convertFetchHeaders({
      ...fetchArgs[1]?.headers,
      host: parsedUrl.hostname,
      accept: 'application/json',
    }),
    method: fetchArgs[1]?.method?.toUpperCase() ?? 'GET',
  });

  return nodeFetch(parsedUrl.href, {
    ...fetchArgs[1],
    headers: signedRequest.headers,
  });
}

export type { FetchAWSSigV4Options };
export { fetchAWSSigV4 };
