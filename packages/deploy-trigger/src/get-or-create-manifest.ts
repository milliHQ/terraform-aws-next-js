import S3 from 'aws-sdk/clients/s3';

import { manifestVersion } from './constants';
import { FileResult, Manifest, ManifestFile } from './types';
import { generateRandomBuildId } from './utils/random-id';

async function getAllObjectsFromBucket(
  s3: S3,
  bucketId: string
): Promise<FileResult[]> {
  let keys: FileResult[] = [];
  let hasMore = true;
  let ContinuationToken: string | undefined;

  while (hasMore) {
    const response = await s3
      .listObjectsV2({ Bucket: bucketId, ContinuationToken })
      .promise();

    if (response.Contents) {
      const _keys = response.Contents.map((entry) => ({
        key: entry.Key!,
        eTag: entry.ETag!,
      }));
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
  const fileKeys = await getAllObjectsFromBucket(s3, bucketId);
  const newBuildId = generateRandomBuildId();

  const files: Record<string, ManifestFile> = {};
  for (const fileKey of fileKeys) {
    files[fileKey.key] = {
      buildId: [newBuildId],
      eTag: fileKey.eTag,
    };
  }

  return {
    currentBuild: newBuildId,
    version: manifestVersion,
    files,
  };
}
