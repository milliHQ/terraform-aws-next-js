import S3 from 'aws-sdk/clients/s3';

import {
  BucketHandler,
  s3CreateBucket as createBucket,
} from '../../../test/utils';
import { deploymentConfigurationKey, manifestVersion } from '../src/constants';
import { getOrCreateManifest } from '../src/get-or-create-manifest';
import { Manifest } from '../src/types';
import { generateS3ClientForTesting } from './test-utils';

describe('deploy-trigger', () => {
  let s3: S3;

  beforeAll(() => {
    // Initialize the local S3 client
    s3 = generateS3ClientForTesting();
  });

  describe('get or create manifest', () => {
    let bucket: BucketHandler;
    const fileNames = [
      '_next/static/chunks/b5500a63de92ae71a2560a1f3ee9c7923c1de4ef.1f52a3ec41a5d5095e70.js',
      '_next/static/chunks/framework.972e47ad649981044547.js',
      '_next/static/chunks/pages/[teamSlug]/[id]-08ca39a64982590c011d.js',
      '404',
    ];

    beforeAll(async () => {
      bucket = await createBucket(s3);

      // Add some fake files to the bucket
      for (const file of fileNames) {
        await s3
          .putObject({
            Bucket: bucket.bucketName,
            Key: file,
            Body: '',
          })
          .promise();
      }
    });

    afterAll(async () => {
      await bucket.destroy();
    });

    test('pre-filled bucket with no manifest', async () => {
      const manifest = await getOrCreateManifest(
        s3,
        bucket.bucketName,
        deploymentConfigurationKey
      );

      expect(manifest.version).toBe(manifestVersion);
      expect(typeof manifest.currentBuild).toBe('string');
      expect(Object.keys(manifest.files).length).toBe(fileNames.length);
      for (const file of fileNames) {
        expect(manifest.files[file]).toBeDefined();
        expect(manifest.files[file].buildId).toContain(manifest.currentBuild);
        expect(manifest.files[file].expiredAt).not.toBeDefined();
      }
    });
  });

  describe('Manifest from empty bucket', () => {
    let bucket: BucketHandler;

    beforeAll(async () => {
      bucket = await createBucket(s3);
    });

    afterAll(async () => {
      await bucket.destroy();
    });

    test('Manifest with no files', async () => {
      const manifest = await getOrCreateManifest(
        s3,
        bucket.bucketName,
        deploymentConfigurationKey
      );

      expect(manifest.version).toBe(manifestVersion);
      expect(typeof manifest.currentBuild).toBe('string');
      expect(Object.keys(manifest.files).length).toBe(0);
    });
  });

  describe('Get existing manifest', () => {
    const manifestBody: Manifest = {
      currentBuild: 'abc',
      version: 1,
      files: {
        '123': {
          buildId: ['def'],
          expiredAt: new Date().toString(),
        },
      },
    };
    let bucket: BucketHandler;

    beforeAll(async () => {
      bucket = await createBucket(s3);

      // Add the manifest to the bucket
      await s3
        .putObject({
          Bucket: bucket.bucketName,
          Key: deploymentConfigurationKey,
          Body: JSON.stringify(manifestBody),
        })
        .promise();
    });

    afterAll(async () => {
      await bucket.destroy();
    });

    test('Manifest should be found', async () => {
      const manifest = await getOrCreateManifest(
        s3,
        bucket.bucketName,
        deploymentConfigurationKey
      );

      expect(manifest).toMatchObject(manifestBody);
    });
  });
});
