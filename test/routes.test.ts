import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

import { parse as parseJSON } from 'hjson';
import { ConfigOutput } from 'tf-next/src/types';
import { CloudFrontResultResponse, S3Event } from 'aws-lambda';
import {
  generateSAM,
  LambdaSAM,
  generateProxySAM,
  ProxySAM,
  normalizeCloudFrontHeaders,
  ConfigLambda,
} from '@dealmore/sammy';
import unzipper, { Entry } from 'unzipper';
import etl from 'etl';
import S3 from 'aws-sdk/clients/s3';

import {
  s3CreateBucket,
  BucketHandler,
  getLocalIpAddressFromHost,
} from './utils';

// We use an increased timeout here because in the worst case
// AWS SAM needs to download a docker image before the test can run
const TEST_TIMEOUT = 2 * 60 * 1000;

const pathToFixtures = path.join(__dirname, 'fixtures');
const pathToProxyPackage = require.resolve(
  '@dealmore/terraform-next-proxy/dist.zip',
  {
    paths: [__dirname],
  }
);
const pathToDeployTriggerPackage = require.resolve(
  '@dealmore/terraform-next-deploy-trigger/dist.zip',
  {
    paths: [__dirname],
  }
);

const deployTriggerFunctionKey = '__deploy-trigger';
const s3Endpoint = process.env.S3_ENDPOINT
  ? process.env.S3_ENDPOINT
  : `${getLocalIpAddressFromHost()}:9000`;

interface ProbeFile {
  probes: {
    path: string;
    mustContain?: string;
    status?: number;
    statusDescription?: string;
    responseHeaders?: Record<string, string>;
    destPath?: string;
  }[];
}

describe('Test proxy config', () => {
  let s3: S3;

  beforeAll(() => {
    // Initialize the local S3 client
    s3 = new S3({
      endpoint: s3Endpoint,
      accessKeyId: process.env.MINIO_ACCESS_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,

      s3ForcePathStyle: true,
      signatureVersion: 'v4',
      sslEnabled: false,
    });
  });

  for (const fixture of fs
    .readdirSync(pathToFixtures)
    .filter((fixture) => fixture.startsWith('00'))) {
    describe(`Testing fixture: ${fixture}`, () => {
      const pathToFixture = path.join(pathToFixtures, fixture);
      let config: ConfigOutput;
      let probeFile: ProbeFile;
      let lambdaSAM: LambdaSAM;
      let proxySAM: ProxySAM;
      let deployBucket: BucketHandler;
      let staticFilesBucket: BucketHandler;

      beforeAll(async () => {
        staticFilesBucket = await s3CreateBucket(s3);

        // Get the config
        config = require(path.join(
          pathToFixture,
          '.next-tf/config.json'
        )) as ConfigOutput;

        // Get the probes
        probeFile = parseJSON(
          fs
            .readFileSync(path.join(pathToFixture, 'probes.json'))
            .toString('utf-8')
        ) as ProbeFile;

        // Generate SAM for SSR (Lambda)
        const lambdas: Record<string, ConfigLambda> = {};
        for (const [key, lambda] of Object.entries(config.lambdas)) {
          lambdas[key] = {
            ...lambda,
            route: undefined,
            routes: {
              ApiRoot: `${lambda.route}/`,
              Api: `${lambda.route}/{proxy+}`,
            },
            memorySize: 1024,
          };
        }

        // Generate SAM for deploy trigger
        lambdas[deployTriggerFunctionKey] = {
          handler: 'handler.handler',
          runtime: 'nodejs14.x',
          filename: pathToDeployTriggerPackage,
          environment: {
            TARGET_BUCKET: staticFilesBucket.bucketName,
            EXPIRE_AFTER_DAYS: '0', // Disable object expiration
            __DEBUG__USE_LOCAL_BUCKET: JSON.stringify({
              endpoint: s3Endpoint,
              accessKeyId: process.env.MINIO_ACCESS_KEY,
              secretAccessKey: process.env.MINIO_SECRET_KEY,

              s3ForcePathStyle: true,
              signatureVersion: 'v4',
              sslEnabled: false,
            }),
          },
        };

        lambdaSAM = await generateSAM({
          lambdas,
          cwd: path.join(pathToFixture, '.next-tf'),
          onData(data:string) {
            console.log(data.toString());
          },
          onError(data:string) {
            console.log(data.toString());
          },
        });
        await lambdaSAM.start();

        // Generate SAM for Proxy (Lambda@Edge)
        const proxyConfig = {
          routes: config.routes,
          staticRoutes: config.staticRoutes,
          lambdaRoutes: Object.values(config.lambdas).map(
            (lambda) => lambda.route
          ),
          prerenders: config.prerenders,
        };

        proxySAM = await generateProxySAM({
          pathToProxyPackage,
          proxyConfig: JSON.stringify(proxyConfig),
          onData(data) {
            console.log(data.toString());
          },
          onError(data) {
            console.log(data.toString());
          },
        });
        await proxySAM.start();

        // Upload static files and process it though static-deploy Lambda
        deployBucket = await s3CreateBucket(s3);
        const staticDeploymentObject = await s3
          .upload({
            Key: 'static-website-files.zip',
            Body: fs.createReadStream(
              path.join(pathToFixture, '.next-tf/', config.staticFilesArchive)
            ),
            Bucket: deployBucket.bucketName,
          })
          .promise();

        const staticDeployFunctionName = lambdaSAM.mapping.get(
          deployTriggerFunctionKey
        )!;

        console.log('staticDeployFunctionName', staticDeployFunctionName)

        await lambdaSAM.sendEvent(
          staticDeployFunctionName,
          'RequestResponse',
          JSON.stringify({
            Records: [
              {
                s3: {
                  bucket: {
                    name: deployBucket.bucketName,
                  },
                  object: {
                    key: staticDeploymentObject.Key,
                  },
                },
              },
            ],
          } as S3Event)
        );
      }, TEST_TIMEOUT);

      afterAll(async () => {
        // Shutdown SAM
        await lambdaSAM.stop();
        await proxySAM.stop();

        // Cleanup buckets
        // await deployBucket.destroy();
        // await staticFilesBucket.destroy();
      }, TEST_TIMEOUT);

      test(
        'Proxy',
        async () => {
          for (const probe of probeFile.probes) {
            const Request = await proxySAM.sendRequestEvent({
              uri: probe.path,
            });

            if ('origin' in Request) {
              // Request
              if (Request.origin?.custom) {
                if (Request.origin.custom.domainName === 'local-apigw.local') {
                  // Request should be served by lambda (SSR)
                  const basePath = Request.origin.custom.path;
                  const { uri, querystring } = Request;

                  // Merge request headers and custom headers from origin
                  const headers = {
                    ...normalizeCloudFrontHeaders(Request.headers),
                    ...normalizeCloudFrontHeaders(
                      Request.origin.custom.customHeaders
                    ),
                  };
                  const requestPath = `${basePath}${uri}${
                    querystring !== '' ? `?${querystring}` : ''
                  }`;

                  const lambdaResponse = await lambdaSAM
                    .sendApiGwRequest(requestPath, {
                      headers,
                    })
                    .then((res) => {
                      return res.text();
                    });

                  if (probe.mustContain) {
                    expect(lambdaResponse).toContain(probe.mustContain);
                  }
                } else {
                  // Request is an external rewrite
                  if (probe.destPath) {
                    const { custom: customOrigin } = Request.origin;
                    const originRequest = new URL(
                      `${customOrigin.protocol}://${customOrigin.domainName}${
                        Request.uri
                      }${Request.querystring ? `?${Request.querystring}` : ''}`
                    );

                    // Check for custom ports
                    if (customOrigin.port !== 80 && customOrigin.port !== 443) {
                      originRequest.port = customOrigin.port.toString();
                    }

                    expect(originRequest).toEqual(new URL(probe.destPath));
                  }
                }
              } else if (Request.origin?.s3) {
                // Request should be served by static file system (S3)
                // Check static routes
                const { uri } = Request;
                if (config.staticRoutes.find((route) => route === uri)) {
                  const pathToStaticFilesArchive = path.join(
                    pathToFixture,
                    '.next-tf',
                    config.staticFilesArchive
                  );

                  const fileContent = await new Promise<Buffer>(
                    (resolve, reject) => {
                      let found = false;
                      // Remove leading / from the path
                      const filePath = uri.replace(/^\//, '');

                      fs.createReadStream(pathToStaticFilesArchive)
                        .pipe(unzipper.Parse())
                        .pipe(
                          etl.map(async (entry: Entry) => {
                            if (entry.path === filePath) {
                              const content = await entry.buffer();
                              found = true;
                              resolve(content);
                            } else {
                              entry.autodrain();
                            }
                          })
                        )
                        .on('finish', () => {
                          if (!found) {
                            reject(`Could not find static file ${filePath}`);
                          }
                        });
                    }
                  ).then((buffer) => buffer.toString('utf-8'));

                  if (probe.mustContain) {
                    expect(fileContent).toContain(probe.mustContain);
                  }
                } else {
                  fail(
                    `Could not resolve ${probe.path} to an existing lambda! (Resolved to: ${uri})`
                  );
                }
              } else {
                fail(`Path ${probe.path} returned invalid proxy request`);
              }
            } else {
              // Request-Response
              const Response = Request as CloudFrontResultResponse;

              if (probe.status) {
                expect(Response.status).toBe(probe.status.toString());
              }

              for (const header in probe.responseHeaders) {
                const lowerHeader = header.toLowerCase();
                expect(Response.headers![lowerHeader]).toBeDefined();
                expect(Response.headers![lowerHeader]).toContainEqual(
                  expect.objectContaining({
                    value: probe.responseHeaders[header],
                  })
                );
              }

              if (probe.statusDescription) {
                expect(Response.statusDescription).toBe(
                  probe.statusDescription
                );
              }
            }
          }
        },
        TEST_TIMEOUT
      );
    });
  }
});
