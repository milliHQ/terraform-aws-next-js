import https from 'https'
import { DynamoDB } from 'aws-sdk'

// Reusing Connections with Keep-Alive in Node.js
// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html
const agent = new https.Agent({
  keepAlive: true,
});

const cache: Record<string, DynamoDB.DocumentClient> = {};

export const getDynamoDBDocumentClient = (region?: string): DynamoDB.DocumentClient => {
  region = region || 'defaultRegion';
  const cached = cache[region]
  if (cached) return cached;

  const ddbClient = new DynamoDB.DocumentClient({
    region,
    httpOptions: { agent },
  });

  cache[region] = ddbClient;
  return ddbClient;
}
