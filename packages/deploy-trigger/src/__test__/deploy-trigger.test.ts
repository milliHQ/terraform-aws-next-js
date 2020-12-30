import * as fs from 'fs';
import { S3 } from 'aws-sdk';

import { deployTrigger } from '../deploy-trigger';
import { BucketHandler, createBucket, generateZipBundle } from './utils';

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
      const packageKey = 'static-website-files.zip';
      const staticRouteKey = '404';
      const staticAssetKey = '_next/static/some.js';
      const packageContent = ['index', staticRouteKey, staticAssetKey];

      // Create an dummy deployment package
      const bundle = await generateZipBundle(packageContent);

      await s3
        .upload({
          Key: 'static-website-files.zip',
          Body: fs.createReadStream(bundle),
          Bucket: sourceBucket.bucketName,
        })
        .promise();

      // Run deployTrigger
      const { buildId, files } = await deployTrigger({
        s3,
        sourceBucket: sourceBucket.bucketName,
        deployBucket: targetBucket.bucketName,
        key: packageKey,
      });

      expect(buildId).toBeDefined();
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
              Key: fileKey,
            }),
          ])
        );
      }

      // Check the mime-type and Cache-Control headers
      const staticRouteObject = await s3
        .getObject({ Bucket: targetBucket.bucketName, Key: staticRouteKey })
        .promise();

      expect(staticRouteObject.ContentType).toBe('text/html');
      expect(staticRouteObject.CacheControl).toBe(
        'public,max-age=0,must-revalidate,s-maxage=31536000'
      );

      const staticAssetObject = await s3
        .getObject({ Bucket: targetBucket.bucketName, Key: staticAssetKey })
        .promise();
      expect(staticAssetObject.ContentType).toBe('application/javascript');
      expect(staticAssetObject.CacheControl).toBe(
        'public,max-age=31536000,immutable'
      );
    });
  });
});
