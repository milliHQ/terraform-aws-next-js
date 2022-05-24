import S3 from 'aws-sdk/clients/s3';

import {
  BucketHandler,
  s3CreateBucket as createBucket,
} from '../../../test/utils';
import {
  deploymentConfigurationKey,
  expireTagKey,
  expireTagValue,
} from '../src/constants';
import { getOrCreateManifest } from '../src/get-or-create-manifest';
import { Manifest } from '../src/types';
import { getInvalidationKeys, updateManifest } from '../src/update-manifest';
import { generateRandomBuildId } from '../src/utils/random-id';
import { addFilesToS3Bucket, generateS3ClientForTesting } from './test-utils';

describe('deploy-trigger', () => {
  let s3: S3;
  let bucket: BucketHandler;

  beforeAll(() => {
    // Initialize the local S3 client
    s3 = generateS3ClientForTesting();
  });

  beforeEach(async () => {
    bucket = await createBucket(s3);
  });

  afterEach(async () => {
    await bucket.destroy();
  });

  describe('update manifest', () => {
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

    beforeEach(async () => {
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

    test('should expire files', async () => {
      const buildId = generateRandomBuildId();
      const files = [
        // Replace route
        {
          key: 'a',
          eTag: '1',
        },
        // Delete route
        // /b/c -> delete
        // Add new route
        { key: 'd', eTag: '1' },
        // Keep asset
        { key: '_next/a.js', eTag: '1' },
        // Remove asset
        // /_next/b.js -> expire
        // New asset
        { key: '_next/c.js', eTag: '1' },

        // Index route
        { key: 'e/f/index', eTag: '1' },
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

  test('Should not invalidate files with the same eTag that are part of current and old deployment', async () => {
    const staticFileKey = 'static-file.txt';

    // Upload initial build files
    await Promise.all([
      s3
        .putObject({
          Bucket: bucket.bucketName,
          Key: staticFileKey,
          Body: 'static-content',
        })
        .promise(),
      s3
        .putObject({
          Bucket: bucket.bucketName,
          Key: 'dynamic-route',
          Body: 'dynamic-content-1',
        })
        .promise(),
    ]);

    const initialETag = (
      await s3
        .getObject({
          Bucket: bucket.bucketName,
          Key: staticFileKey,
        })
        .promise()
    ).ETag;
    expect(initialETag).toBeDefined();

    const manifest = await getOrCreateManifest(
      s3,
      bucket.bucketName,
      deploymentConfigurationKey
    );

    // Reupload static and changed dynamic content
    // Upload initial build files
    await Promise.all([
      s3
        .putObject({
          Bucket: bucket.bucketName,
          Key: staticFileKey,
          Body: 'static-content',
        })
        .promise(),
      s3
        .putObject({
          Bucket: bucket.bucketName,
          Key: 'dynamic-route',
          Body: 'dynamic-content-2',
        })
        .promise(),
    ]);

    const updatedETag = (
      await s3
        .getObject({
          Bucket: bucket.bucketName,
          Key: staticFileKey,
        })
        .promise()
    ).ETag;
    expect(updatedETag).toBeDefined();
    expect(initialETag).toEqual(updatedETag);

    const buildId = generateRandomBuildId();

    const { manifest: updatedManifest, invalidate } = await updateManifest({
      s3,
      bucket: bucket.bucketName,
      buildId,
      deploymentConfigurationKey,
      expireAfterDays: 30,
      files: [
        { key: staticFileKey, eTag: initialETag! }, // same eTag
        { key: 'dynamic-route', eTag: 'changedETag' }, // changed eTag
      ],
      manifest,
    });

    expect(updatedManifest.currentBuild).toBe(buildId);
    // Should only
    expect(invalidate.sort()).toEqual(['/dynamic-route*'].sort());
  });
});

describe('[deploy-trigger] getInvalidationKeys', () => {
  test.each([
    ['test', '/test*'],
    ['test/[slug]', '/test*'],
    ['test/[slug]/abc', '/test*'],
    ['test/[...slug]', '/test*'],
    ['test/[[...slug]]', '/test*'],
    ['test/[testId]/index', '/test*'],
    ['test/[testId]/[otherId]', '/test*'],
  ])('Generated invalidationKey from %s should be %s', (input, output) => {
    const invalidationKeys = getInvalidationKeys([input]);

    expect(invalidationKeys).toEqual([output]);
  });

  test('Root index route', () => {
    const invalidationKeys = getInvalidationKeys(['index']);

    expect(invalidationKeys).toEqual(['/', '/?*']);
  });

  test('Skip routes from _next', () => {
    const invalidationKeys = getInvalidationKeys([
      '_next/abc',
      '_next/def',
      '_next/ghi',
    ]);

    expect(invalidationKeys).toEqual([]);
  });
});
