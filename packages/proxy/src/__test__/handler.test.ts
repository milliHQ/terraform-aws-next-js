import { createServer, Server } from 'http';
import { CloudFrontRequestEvent, CloudFrontRequest } from 'aws-lambda';
import getPort from 'get-port';

import { handler } from '../handler';
import { ProxyConfig } from '../types';

// Max runtime of the lambda
const TIMEOUT = 30000;

describe('[proxy] Handler', () => {
  const proxyConfig: ProxyConfig = {
    lambdaRoutes: [],
    prerenders: {},
    staticRoutes: [],
    routes: [
      {
        src: '^\\/docs(?:\\/([^\\/]+?))$',
        dest: 'http://example.com/docs/$1',
        check: true,
      },
    ],
  };
  let configEndpoint: string;
  let configServer: Server;

  beforeEach(async () => {
    // Create config endpoint before
    const port = await getPort();
    await new Promise<void>((resolve) => {
      configServer = createServer((_req, res) => {
        res.end(JSON.stringify(proxyConfig));
      }).listen(port, () => {
        resolve();
      });
    });

    configEndpoint = `http://localhost:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      configServer.close((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });

  test(
    'External redirect',
    async () => {
      const requestPath = '/docs/hello/world';

      // Origin Request
      // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html#example-origin-request
      const event: CloudFrontRequestEvent = {
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
                          value: 'example.localhost',
                        },
                      ],
                    },
                    region: 'us-east-1',
                    authMethod: 'origin-access-identity',
                    domainName: 's3.localhost',
                    path: '',
                  },
                },
                querystring: '',
                uri: requestPath,
              },
            },
          },
        ],
      };

      const result = (await handler(event)) as CloudFrontRequest;

      expect(result.origin?.custom).toBeDefined();

      console.log('HELLO', result);
    },
    TIMEOUT
  );
});
