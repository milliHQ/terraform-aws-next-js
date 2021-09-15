import { DynamoDB } from 'aws-sdk';
import { ProxyConfig } from '../types';
import { fetchTimeout } from './fetch-timeout';

// Timeout the connection before 30000ms to be able to print an error message
// See Lambda@Edge Limits for origin-request event here:
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html#lambda-requirements-see-limits
const FETCH_TIMEOUT = 29500;

/**
 * Retrieves and parses the config object for the proxy over HTTP.
 * @param endpointUrl URL where the config should be fetched from
 * @returns Parsed config object
 */
export async function fetchProxyConfig(endpointUrl: string, table?: string, region?: string, alias?: string) {
  if (table) {
    const dynamoDB = new DynamoDB({
      region,
    });

    const item = await dynamoDB.getItem({
      TableName: table,
      Key: {
        alias: { S: alias },
      }
    }).promise();

    if (item.Item?.proxyConfig?.S) {
      try {
        const config = JSON.parse(item.Item.proxyConfig.S);
        return config as ProxyConfig;
      } catch (_) {
        // If something fails, we continue with the default
        // behaviour of trying to fetch the config from the bucket
      }
    }
  }

  return fetchTimeout(FETCH_TIMEOUT, endpointUrl).then(
    (res) => res.json() as Promise<ProxyConfig>
  );
}
