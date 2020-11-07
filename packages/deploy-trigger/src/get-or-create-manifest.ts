import { S3 } from 'aws-sdk';

import { manifestVersion } from './constants';
import { Manifest, ManifestFile } from './types';
import { generateRandomBuildId } from './utils';

async function getAllObjectKeysFromBucket(s3: S3, bucketId: string) {
  let keys: string[] = [];
  let hasMore = true;
  let ContinuationToken: string | undefined;

  while (hasMore) {
    const response = await s3
      .listObjectsV2({ Bucket: bucketId, ContinuationToken })
      .promise();

    if (response.Contents) {
      const _keys = response.Contents.map((entry) => entry.Key!);
      keys = keys.concat(_keys);
    }

    // Has more than 1000 entries in the last request,
    // so we need to make another call
    hasMore = Boolean(response.IsTruncated);
    ContinuationToken = response.NextContinuationToken;
  }

  return keys;
}

export async function getOrCreateManifest(
  s3: S3,
  bucketId: string,
  deploymentConfigurationKey: string
): Promise<Manifest> {
  let manifest: Manifest | undefined;

  try {
    const manifestObj = await s3
      .getObject({
        Key: deploymentConfigurationKey,
        Bucket: bucketId,
      })
      .promise();

    if (manifestObj.Body) {
      // Parse the manifest
      const manifestBody = manifestObj.Body.toString('utf-8');
      manifest = JSON.parse(manifestBody) as Manifest;
    }
  } catch (err) {}

  // If manifest parsing was successful return it
  if (manifest) {
    return manifest;
  }

  // Create a new manifest with existing files from the bucket
  const fileKeys = await getAllObjectKeysFromBucket(s3, bucketId);
  const newBuildId = generateRandomBuildId();

  const files: Record<string, ManifestFile> = {};
  for (const fileKey of fileKeys) {
    files[fileKey] = {
      buildId: [newBuildId],
    };
  }

  return {
    currentBuild: newBuildId,
    version: manifestVersion,
    files,
  };
}
