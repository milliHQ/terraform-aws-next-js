import { CloudFrontRequestEvent } from 'aws-lambda';

type GenerateCloudFrontRequestEventOptions = {
  /**
   * Endpoint of the API Gateway.
   */
  apiGatewayEndpoint?: string;
  /**
   * URL where the proxy config can be fetched from.
   */
  configEndpoint: string;
  /**
   * Querystring of the original request.
   */
  querystring?: string;
  /**
   * Pathname (without querystring) of the original request.
   */
  uri: string;
};

/**
 * Generates a CloudFrontRequestEvent object.
 * @see {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html#example-origin-request}
 */
function generateCloudFrontRequestEvent(
  options: GenerateCloudFrontRequestEventOptions
): CloudFrontRequestEvent {
  const {
    apiGatewayEndpoint = 'example.localhost',
    configEndpoint,
    querystring = '',
    uri,
  } = options;

  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: 'd111111abcdef8.cloudfront.net',
            distributionId: 'EDFDVBD6EXAMPLE',
            eventType: 'origin-request',
            requestId:
              '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ==',
          },
          request: {
            clientIp: '203.0.113.178',
            headers: {
              'x-forwarded-for': [
                {
                  key: 'X-Forwarded-For',
                  value: '203.0.113.178',
                },
              ],
              'user-agent': [
                {
                  key: 'User-Agent',
                  value: 'Amazon CloudFront',
                },
              ],
              via: [
                {
                  key: 'Via',
                  value:
                    '2.0 2afae0d44e2540f472c0635ab62c232b.cloudfront.net (CloudFront)',
                },
              ],
              host: [
                {
                  key: 'Host',
                  value: 'example.org',
                },
              ],
              'cache-control': [
                {
                  key: 'Cache-Control',
                  value: 'no-cache, cf-no-cache',
                },
              ],
            },
            method: 'GET',
            origin: {
              s3: {
                customHeaders: {
                  'x-env-config-endpoint': [
                    {
                      key: 'x-env-config-endpoint',
                      value: configEndpoint,
                    },
                  ],
                  'x-env-api-endpoint': [
                    {
                      key: 'x-env-api-endpoint',
                      value: apiGatewayEndpoint,
                    },
                  ],
                },
                region: 'us-east-1',
                authMethod: 'origin-access-identity',
                domainName: 's3.localhost',
                path: '',
              },
            },
            querystring,
            uri,
          },
        },
      },
    ],
  };
}

export { generateCloudFrontRequestEvent };
