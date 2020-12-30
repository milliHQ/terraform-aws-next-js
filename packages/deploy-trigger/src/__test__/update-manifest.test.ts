import { S3 } from 'aws-sdk';

import {
  deploymentConfigurationKey,
  expireTagKey,
  expireTagValue,
} from '../constants';
import { getOrCreateManifest } from '../get-or-create-manifest';
import { Manifest } from '../types';
import { updateManifest } from '../update-manifest';
import { generateRandomBuildId } from '../utils';
import {
  addFilesToS3Bucket,
  BucketHandler,
  createBucket,
  generateS3ClientForTesting,
} from './utils';

describe('deploy-trigger', () => {
  let s3: S3;

  beforeAll(() => {
    // Initialize the local S3 client
    s3 = generateS3ClientForTesting();
  });

  describe('update manifest', () => {
    let bucket: BucketHandler;
    const toBeExpiredFiles = [
      // Static routes
      'a',
      'b/c',
      // root index routes
      'index',
      // Static assets
      '_next/a.js',
      '_next/b.js',
    ];
    let manifest: Manifest;

    beforeAll(async () => {
      bucket = await createBucket(s3);
      await addFilesToS3Bucket(s3, bucket.bucketName, toBeExpiredFiles);
      manifest = await getOrCreateManifest(
        s3,
        bucket.bucketName,
        deploymentConfigurationKey
      );

      // Wait a second
      // So that we can spot a difference on LastModified dates in S3
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    afterAll(async () => {
      await bucket.destroy();
    });

    test('should expire files', async () => {
      const buildId = generateRandomBuildId();
      const files = [
        // Replace route
        'a',
        // Delete route
        // /b/c -> delete
        // Add new route
        'd',
        // Keep asset
        '_next/a.js',
        // Remove asset
        // /_next/b.js -> expire
        // New asset
        '_next/c.js',

        // Index route
        'e/f/index',
      ];

      // Get the soon to be expired files before the update
      const expiredObjectBeforeUpdate = await s3
        .getObject({ Bucket: bucket.bucketName, Key: '_next/b.js' })
        .promise();

      const {
        manifest: updatedManifest,
        expire,
        restore,
        invalidate,
        deleted,
      } = await updateManifest({
        s3,
        bucket: bucket.bucketName,
        buildId,
        deploymentConfigurationKey,
        expireAfterDays: 30,
        files,
        manifest,
      });

      // No restores here
      expect(restore.length).toBe(0);

      expect(expire).toContain('_next/b.js');
      const expiredS3Object = await s3
        .getObject({
          Bucket: bucket.bucketName,
          Key: '_next/b.js',
        })
        .promise();

      // Check that modify date has changed after update
      expect(expiredObjectBeforeUpdate.LastModified).toBeDefined();
      expect(expiredS3Object.LastModified).toBeDefined();
      expect(expiredObjectBeforeUpdate.LastModified).not.toEqual(
        expiredS3Object.LastModified
      );

      const expiredS3ObjectTags = await s3
        .getObjectTagging({
          Bucket: bucket.bucketName,
          Key: '_next/b.js',
        })
        .promise();
      expect(expiredS3ObjectTags.TagSet).toContainEqual(
        expect.objectContaining({
          Key: expireTagKey,
          Value: expireTagValue,
        })
      );

      const shouldNotExpired = ['_next/a.js', '_next/c.js', 'a', '/b/c', 'd'];
      expect(expire).not.toEqual(expect.arrayContaining(shouldNotExpired));

      for (const notExpired of ['_next/a.js', 'a']) {
        const notExpiredS3ObjectTags = await s3
          .getObjectTagging({
            Bucket: bucket.bucketName,
            Key: notExpired,
          })
          .promise();

        expect(notExpiredS3ObjectTags.TagSet).not.toContainEqual(
          expect.objectContaining({
            Key: expireTagKey,
            Value: expireTagValue,
          })
        );
      }

      expect(updatedManifest.currentBuild).toBe(buildId);
      // Check if both arrays contain the same elements
      expect(Object.keys(updatedManifest.files).sort()).toEqual(
        ['a', 'd', '_next/a.js', 'e/f/index', '_next/b.js', '_next/c.js'].sort()
      );

      // Test the invalidation paths
      expect(invalidate.sort()).toEqual(
        ['/', '/?*', '/e/f*', '/a*', '/b/c*', '/d*'].sort()
      );

      // Check which files got deleted
      const shouldBeDeleted = ['index', 'b/c'];
      expect(deleted.sort()).toEqual(shouldBeDeleted.sort());

      // Check if the files were deleted from S3
      for (const file of shouldBeDeleted) {
        expect(
          s3.headObject({
            Bucket: bucket.bucketName,
            Key: file,
          }).promise
        ).toThrow();
      }
    });
  });
});
