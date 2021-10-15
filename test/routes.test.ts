import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

import { parse as parseJSON } from 'hjson';
import { ConfigOutput } from 'tf-next/src/types';
import { CloudFrontResultResponse, S3Event } from 'aws-lambda';
import {
  generateLocalSAM,
  LocalSAMGenerator,
  generateAPISAM,
  APISAMGenerator,
  generateProxySAM,
  ProxySAM,
  normalizeCloudFrontHeaders,
  ConfigLambda,
} from '@millihq/sammy';
import S3 from 'aws-sdk/clients/s3';

import {
  s3CreateBucket,
  BucketHandler,
  getLocalIpAddressFromHost,
  AttachLoggerResult,
  attachLogger,
} from './utils';

// We use an increased timeout here because in the worst case
// AWS SAM needs to download a docker image before the test can run
jest.setTimeout(2 * 60 * 1000);

// Log files where the output from the SAM CLI should be written to
// (Using console.log for this would )
const SAMLogFileLocal = 'sam-local.log';
const SAMLogFileAPI = 'sam-api.log';

const pathToFixtures = path.join(__dirname, 'fixtures');
const pathToProxyPackage = require.resolve(
  '@millihq/terraform-next-proxy/dist.zip',
  {
    paths: [__dirname],
  }
);
const pathToDeployTriggerPackage = require.resolve(
  '@millihq/terraform-next-deploy-trigger/dist.zip',
  {
    paths: [__dirname],
  }
);

const s3Endpoint = `${getLocalIpAddressFromHost()}:9000`;

interface ProbeFile {
  probes: {
    path: string;
    mustContain?: string;
    status?: number;
    statusDescription?: string;
    responseHeaders?: Record<string, string>;
    requestHeaders?: Record<string, string>;
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

  for (const fixture of fs.readdirSync(pathToFixtures)) {
    describe(`Testing fixture: ${fixture}`, () => {
      const pathToFixture = path.join(pathToFixtures, fixture);
      let config: ConfigOutput;
      let probeFile: ProbeFile;
      /**
       * Logger for apiSAM
       */
      let loggerApiSAM: AttachLoggerResult;
      /**
       * apiSAM handles request against SSR Lambdas from Next.js
       * (through API-Gateway)
       */
      let apiSAM: APISAMGenerator;
      /**
       * Logger for localSAM
       */
      let loggerlocalSAM: AttachLoggerResult;
      /**
       * lambdaSAM handles request against deploy trigger component
       */
      let localSAM: LocalSAMGenerator;
      /**
       * proxySAM handles requests against the proxy (Lambda@Edge)
       */
      let proxySAM: ProxySAM;
      /**
       * Bucket where the static-files.zip file is uploaded to
       * (for further processing through deploy trigger)
       */
      let deployBucket: BucketHandler;
      /**
       * Target bucket where the static files are extracted to
       * (from deploy trigger)
       */
      let staticFilesBucket: BucketHandler;

      beforeAll(async () => {
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

        /* ---------------------------------------------------------------------
         * Prepare deploy-trigger integration
         * -------------------------------------------------------------------*/
        const staticDeployFunctionName = 'deployTrigger';

        staticFilesBucket = await s3CreateBucket(s3);
        deployBucket = await s3CreateBucket(s3);

        localSAM = await generateLocalSAM({
          lambdas: {
            [staticDeployFunctionName]: {
              handler: 'handler.handler',
              runtime: 'nodejs14.x',
              filename: pathToDeployTriggerPackage,
              environment: {
                TARGET_BUCKET: staticFilesBucket.bucketName,
                EXPIRE_AFTER_DAYS: '0',
                // No CF invalidation is created
                __DEBUG__SKIP_INVALIDATIONS: 'true',
                __DEBUG__USE_LOCAL_BUCKET: JSON.stringify({
                  endpoint: s3Endpoint,
                  accessKeyId: process.env.MINIO_ACCESS_KEY,
                  secretAccessKey: process.env.MINIO_SECRET_KEY,

                  s3ForcePathStyle: true,
                  signatureVersion: 'v4',
                  sslEnabled: false,
                }),
              },
            },
          },
          cwd: path.join(pathToFixture, '.next-tf'),
          randomizeFunctionNames: false,
        });
        // Attach logger
        loggerlocalSAM = attachLogger(SAMLogFileLocal, localSAM);
        await localSAM.start();

        // Upload static files and process it though static-deploy Lambda
        const staticDeploymentObject = await s3
          .upload({
            Key: 'static-website-files.zip',
            Body: fs.createReadStream(
              path.join(pathToFixture, '.next-tf/', config.staticFilesArchive)
            ),
            Bucket: deployBucket.bucketName,
          })
          .promise();

        await localSAM.sendEvent(
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

        /* ---------------------------------------------------------------------
         * Prepare API-Gateway integration
         * -------------------------------------------------------------------*/

        // Generate the Lambdas for API-Gateway integration (SSR)
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

        apiSAM = await generateAPISAM({
          lambdas,
          cwd: path.join(pathToFixture, '.next-tf'),
          randomizeFunctionNames: true,
        });
        // Attach logger
        loggerApiSAM = attachLogger(SAMLogFileAPI, apiSAM);
        await apiSAM.start();

        /* ---------------------------------------------------------------------
         * Prepare Proxy integration (Lambda@Edge)
         * -------------------------------------------------------------------*/

        const proxyConfig = {
          routes: config.routes,
          staticRoutes: config.staticRoutes,
          lambdaRoutes: Object.values(config.lambdas).map(
            (lambda) => lambda.route
          ),
          prerenders: config.prerenders,
        };

        proxySAM = await generateProxySAM({
          runtime: 'nodejs14.x',
          pathToProxyPackage,
          proxyConfig: JSON.stringify(proxyConfig),
          onData(data: string) {
            console.log(data.toString());
          },
          onError(data: string) {
            console.log(data.toString());
          },
        });
        await proxySAM.start();
      });

      afterAll(async () => {
        // Close loggers
        loggerlocalSAM.stop();
        loggerApiSAM.stop();

        // Shutdown SAM
        await localSAM.stop();
        await apiSAM.stop();
        await proxySAM.stop();

        // Cleanup buckets
        await deployBucket.destroy();
        await staticFilesBucket.destroy();
      });

      test('Proxy', async () => {
        for (const probe of probeFile.probes) {
          const Request = await proxySAM.sendRequestEvent({
            uri: probe.path,
            headers: probe.requestHeaders,
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

                const lambdaResponse = await apiSAM
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
                const filePath = uri.replace(/^\//, '');

                // Download the file from the S3
                const fileContent = await s3
                  .getObject({
                    Bucket: staticFilesBucket.bucketName,
                    Key: filePath,
                  })
                  .promise()
                  .then(({ Body }) => {
                    if (Body) {
                      return Body.toString();
                    }

                    throw new Error(`File is empty: ${filePath}`);
                  });

                if (probe.mustContain) {
                  expect(fileContent).toContain(probe.mustContain);
                }
              } else {
                throw new Error(
                  `Could not resolve ${probe.path} to an existing lambda! (Resolved to: ${uri})`
                );
              }
            } else {
              throw new Error(
                `Path ${probe.path} returned invalid proxy request`
              );
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
              expect(Response.statusDescription).toBe(probe.statusDescription);
            }
          }
        }
      });
    });
  }
});
