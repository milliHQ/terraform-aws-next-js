import { ProxyConfig, Deployment, DeploymentInDB } from '../types';
import { fetchTimeout } from './fetch-timeout';
import { getDynamoDBDocumentClient } from './get-ddb-client'

// Timeout the connection before 30000ms to be able to print an error message
// See Lambda@Edge Limits for origin-request event here:
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html#lambda-requirements-see-limits
const FETCH_TIMEOUT = 29500;

/**
 * Retrieves and parses the config object for the proxy over HTTP.
 * @param endpointUrl URL where the config should be fetched from
 * @returns Parsed config object
 */
export async function fetchDeployment(endpointUrl: string, table?: string, region?: string, alias?: string) {
  if (table) {
    const ddbClient = getDynamoDBDocumentClient(region);

    const dbResult = await ddbClient.get({
      TableName: table,
      Key: { alias },
    }).promise();

    if (dbResult.Item) {
      try {
        const deployment: Deployment = {
          ...dbResult.Item as DeploymentInDB,
          proxyConfig: JSON.parse(dbResult.Item.proxyConfig),
        };
        return deployment;
      } catch (_) {
        // If something fails, we continue with the default
        // behaviour of trying to fetch the config from the bucket
      }
    }
  }

  const res = await fetchTimeout(FETCH_TIMEOUT, endpointUrl);
  const proxyConfig = (await res.json()) as ProxyConfig;
  const deployment: Deployment = { alias: '-', proxyConfig };
  return deployment;
}
