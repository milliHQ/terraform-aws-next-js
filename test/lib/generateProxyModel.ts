import * as path from 'path';
import * as fs from 'fs';
import { dirSync as tmpDir } from 'tmp';
import { stringify as yaml } from 'yaml';
import { Lambda as AWSLambda } from 'aws-sdk';
import {
  CloudFrontRequest,
  CloudFrontRequestEvent,
  CloudFrontResultResponse,
} from 'aws-lambda';
import getPort from 'get-port';
import http from 'http';
import { URL } from 'url';
import { ConfigOutput } from 'tf-next/src/types';

import { SAMTemplate } from './types';
import { getLocalIpAddressFromHost, unzipToLocation } from './utils';
import { createSAMLocal, SAMLocal } from './SAMLocal';

const LambdaFunctionName = 'proxy';

/**
 * SAM wrapper for the Lambda@Edge Proxy
 */

interface Props {
  pathToProxyPackage: string;
  config: ConfigOutput;
}

interface SendRequestEventProps {
  uri: string;
}

export interface SAM {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  sendRequestEvent(
    payload: SendRequestEventProps
  ): Promise<CloudFrontRequest | CloudFrontResultResponse>;
}

export async function generateProxySAM({
  pathToProxyPackage,
  config,
}: Props): Promise<SAM> {
  const _tmpDir = tmpDir({ unsafeCleanup: true });
  const workdir = _tmpDir.name;

  // Generates proxyConfig from ConfigOutput
  const proxyConfig = {
    routes: config.routes,
    staticRoutes: config.staticRoutes,
    lambdaRoutes: Object.values(config.lambdas).map((lambda) => lambda.route),
    prerenders: config.prerenders,
  };

  // Generate the SAM yml
  const SAMTemplate: SAMTemplate = {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: ['AWS::Serverless-2016-10-31'],
    Resources: {},
  };

  // Unpack proxy
  await unzipToLocation(
    pathToProxyPackage,
    path.join(workdir, LambdaFunctionName)
  );
  SAMTemplate.Resources[LambdaFunctionName] = {
    Type: 'AWS::Serverless::Function',
    // See resource limits for Lambda@Edge.
    // We use Origin request event for the proxy
    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html#lambda-requirements-see-limits
    Properties: {
      Handler: `${LambdaFunctionName}/handler.handler`,
      Description: 'Lambda@Edge Proxy',
      Runtime: 'nodejs12.x',
      MemorySize: 128,
      Timeout: 30,
    },
  };

  // Write the SAM template
  fs.writeFileSync(path.join(workdir, 'template.yml'), yaml(SAMTemplate));

  let SAM: SAMLocal;
  let port: number;
  let client: AWSLambda;
  let portProxyConfig: number;
  // Simple HTTP server to serve the proxy config
  // https://stackoverflow.com/a/44188852/831465
  const serverProxyConfig = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify(proxyConfig));
  });

  async function start() {
    // Initialize SAM
    port = await getPort();
    SAM = await createSAMLocal('sdk', workdir, port);
    client = new AWSLambda({
      endpoint: `http://localhost:${port}`,
      region: 'local',
    });

    // Initialize Proxy Config Server
    portProxyConfig = await getPort();
    await new Promise<void>((resolve) =>
      serverProxyConfig.listen(portProxyConfig, '0.0.0.0', () => {
        resolve();
      })
    );
  }

  async function stop() {
    await SAM.kill();
    await new Promise<void>((resolve, reject) => {
      serverProxyConfig.close((err) => {
        if (err) return reject(err);

        resolve();
      });
    });
    _tmpDir.removeCallback();
  }

  async function sendRequestEvent({ uri }: SendRequestEventProps) {
    // We need to parse the path and searchParams
    // URL is only allowed with urls not uris:
    // https://github.com/nodejs/node/issues/12682
    const url = new URL(uri, 'http://example.org');

    // We cannot access localhost from inside the lambda, so we need the IP
    // from the docker host to reach the proxy config server
    // https://github.com/aws/aws-sam-cli/issues/260
    const localIpAddress = getLocalIpAddressFromHost();

    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html#example-origin-request
    const payload: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {
              distributionDomainName: 'd111111abcdef8.cloudfront.net',
              distributionId: 'EDFDVBD6EXAMPLE',
              eventType: 'viewer-request',
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
                        value: `http://${localIpAddress}:${portProxyConfig}/`,
                      },
                    ],
                    'x-env-api-endpoint': [
                      { key: 'x-env-api-endpoint', value: 'local-apigw.local' },
                    ],
                  },
                  domainName: 's3.local',
                  path: '',
                  authMethod: 'none',
                  region: 'local',
                },
              },
              querystring: url.searchParams.toString(),
              uri: url.pathname,
            },
          },
        },
      ],
    };

    const response = await client
      .invoke({
        FunctionName: LambdaFunctionName,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(payload),
      })
      .promise();

    // Parse the invocationResult
    // base64 -> string -> JSON -> CloudFrontRequest
    return JSON.parse(
      Buffer.from(
        response.$response.httpResponse.body as string,
        'base64'
      ).toString('utf-8')
    ) as CloudFrontRequest | CloudFrontResultResponse;
  }

  return {
    start,
    stop,
    sendRequestEvent,
  };
}
