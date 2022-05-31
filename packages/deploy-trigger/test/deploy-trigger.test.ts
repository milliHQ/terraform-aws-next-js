import * as fs from 'fs';

import S3 from 'aws-sdk/clients/s3';

import {
  BucketHandler,
  s3CreateBucket as createBucket,
} from '../../../test/utils';
import { DEPLOYMENT_ID_META_KEY, deployTrigger } from '../src/deploy-trigger';
import { generateZipBundle } from './test-utils';
import { generateRandomBuildId } from '../src/utils/random-id';

describe('deploy-trigger', () => {
  let s3: S3;

  beforeAll(() => {
    // Initialize the local S3 client
    s3 = new S3({
      endpoint: process.env.S3_ENDPOINT,
      accessKeyId: process.env.MINIO_ACCESS_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,

      s3ForcePathStyle: true,
      signatureVersion: 'v4',
      sslEnabled: false,
    });
  });

  describe('Extract an uploaded deployment', () => {
    let sourceBucket: BucketHandler;
    let targetBucket: BucketHandler;

    beforeAll(async () => {
      // Initialize buckets
      sourceBucket = await createBucket(s3);
      targetBucket = await createBucket(s3);
    });

    afterAll(async () => {
      // Cleanup buckets
      await sourceBucket.destroy();
      await targetBucket.destroy();
    });

    test('Extract an uploaded deployment', async () => {
      const staticRouteKey = '404';
      const localeStaticRouteKey = 'es';
      const staticAssetKey = '_next/static/some.js';
      const packageContent = [
        'index',
        localeStaticRouteKey,
        staticRouteKey,
        staticAssetKey,
      ];

      // Create an dummy deployment package
      const bundle = await generateZipBundle(
        {
          routes: [],
          lambdas: {},
          lambdaRoutes: [],
          prerenders: {},
          staticRoutes: [],
          version: 1,
        },
        packageContent
      );

      const initialDeploymentId = generateRandomBuildId();
      const packageKey = `${initialDeploymentId}.zip`;

      await s3
        .upload({
          Key: packageKey,
          Body: fs.createReadStream(bundle),
          Bucket: sourceBucket.bucketName,
          Metadata: {
            [DEPLOYMENT_ID_META_KEY]: initialDeploymentId,
          },
        })
        .promise();

      // Run deployTrigger
      const { deploymentId, files } = await deployTrigger({
        s3,
        sourceBucket: sourceBucket.bucketName,
        deployBucket: targetBucket.bucketName,
        key: packageKey,
      });

      expect(deploymentId).toBe(initialDeploymentId);
      expect(files.length).toBe(packageContent.length);

      // Check targetBucket
      const { Contents } = await s3
        .listObjects({ Bucket: targetBucket.bucketName })
        .promise();

      // Check if the whole content from the deployment package is uploaded
      // to the target bucket
      for (const fileKey of packageContent) {
        expect(Contents).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              Key: `${deploymentId}/static/${fileKey}`,
            }),
          ])
        );
      }

      // Check the mime-type and Cache-Control headers
      const localeStaticRouteObject = await s3
        .getObject({
          Bucket: targetBucket.bucketName,
          Key: `${deploymentId}/static/${localeStaticRouteKey}`,
        })
        .promise();

      expect(localeStaticRouteObject.ContentType).toBe(
        'text/html; charset=utf-8'
      );
      expect(localeStaticRouteObject.CacheControl).toBe(
        'public,max-age=0,must-revalidate,s-maxage=31536000'
      );

      // Check the mime-type and Cache-Control headers
      const staticRouteObject = await s3
        .getObject({
          Bucket: targetBucket.bucketName,
          Key: `${deploymentId}/static/${staticRouteKey}`,
        })
        .promise();

      expect(staticRouteObject.ContentType).toBe('text/html; charset=utf-8');
      expect(staticRouteObject.CacheControl).toBe(
        'public,max-age=0,must-revalidate,s-maxage=31536000'
      );

      const staticAssetObject = await s3
        .getObject({
          Bucket: targetBucket.bucketName,
          Key: `${deploymentId}/static/${staticAssetKey}`,
        })
        .promise();
      expect(staticAssetObject.ContentType).toBe(
        'application/javascript; charset=utf-8'
      );
      expect(staticAssetObject.CacheControl).toBe(
        'public,max-age=31536000,immutable'
      );
    });
  });
});
