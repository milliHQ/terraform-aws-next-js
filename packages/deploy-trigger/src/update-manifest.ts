import S3 from 'aws-sdk/clients/s3';

import { expireTagKey, expireTagValue } from './constants';
import { ExpireValue, FileResult, Manifest, ManifestFile } from './types';

// Regex mather for paths with dynamic parts
// e.g. - [id]/index
//      - test/[...slug]/index
const dynamicPartMatcher = new RegExp(/\/?\[[^\]]+\].*/);

async function expireFiles(s3: S3, bucketId: string, files: string[]) {
  // Set the expiration tags on the expired files
  for (const file of files) {
    // Reset S3 Object Timestamp (CreationDate)
    // So the expire rule runs at (t + expireAfterDays)
    // https://stackoverflow.com/a/18730911/831465
    await s3
      .copyObject({
        Bucket: bucketId,
        CopySource: `/${bucketId}/${file}`,
        Key: file,
        StorageClass: 'STANDARD', // This makes the Timestamp reset
      })
      .promise();

    // Set the expiration tag
    const existingTags = await s3
      .getObjectTagging({
        Bucket: bucketId,
        Key: file,
      })
      .promise();

    await s3
      .putObjectTagging({
        Bucket: bucketId,
        Key: file,
        Tagging: {
          TagSet: [
            ...existingTags.TagSet,
            {
              Key: expireTagKey,
              Value: expireTagValue,
            },
          ],
        },
      })
      .promise();
  }
}

async function removeExpirationFromFiles(
  s3: S3,
  bucketId: string,
  files: string[]
) {
  // Remove expire tags from file
  for (const file of files) {
    const tags = await s3
      .getObjectTagging({
        Bucket: bucketId,
        Key: file,
      })
      .promise();

    // Remove expire tag from the tagSet
    const newTags = tags.TagSet.filter(({ Key }) => {
      return Key !== expireTagKey;
    });

    await s3.putObjectTagging({
      Bucket: bucketId,
      Key: file,
      Tagging: {
        TagSet: newTags,
      },
    });
  }
}

async function deleteFiles(s3: S3, bucketId: string, files: string[]) {
  try {
    await s3.deleteObjects({
      Bucket: bucketId,
      Delete: {
        Objects: files.map((file) => ({
          Key: file,
        })),
      },
    }).promise;
  } catch (err) {
    // Fail silently when the file is already deleted
  }
}

function getInvalidationKeys(files: string[]) {
  const invalidations: string[] = [];

  for (const file of files) {
    // Skip static assets files with hashes
    if (file.startsWith('_next')) {
      continue;
    }

    // check for root route
    // Since we don't want to kill the whole cache we cannot return /* here
    // but use
    // - `/`   (without query params)
    // - `/?*` (with query params)
    if (file === 'index') {
      invalidations.push('/', '/?*');
      continue;
    }

    // Check if the a dynamic part is in the filename
    // e.g. - [abc]/index       ->  *
    //      - test/[...slug]    ->  test/*
    if (file.match(dynamicPartMatcher)) {
      invalidations.push(`/${file.replace(dynamicPartMatcher, '*')}`);
      continue;
    }

    // Default index routes
    // /some/route/index -> /some/route*
    if (file.endsWith('/index')) {
      invalidations.push(`/${file.slice(0, -6)}*`);
      continue;
    }

    invalidations.push(`/${file}*`);
  }

  return invalidations;
}

interface Props {
  s3: S3;
  bucket: string;
  buildId: string;
  files: FileResult[];
  expireAfterDays: ExpireValue;
  deploymentConfigurationKey: string;
  manifest: Manifest;
}

interface Response {
  expire: string[];
  restore: string[];
  deleted: string[];
  invalidate: string[];
  manifest: Manifest;
}

/**
 * Reads or creates a deployment.json file which holds information about
 * which files were included in the deployment
 *
 * It returns an array of keys that should be expired
 */
async function updateManifest({
  files,
  buildId,
  s3,
  deploymentConfigurationKey,
  expireAfterDays,
  bucket,
  manifest,
}: Props): Promise<Response> {
  const expire: string[] = [];
  const deleted: string[] = [];
  const restore: string[] = [];
  const unchangedFiles = new Set<string>();

  const newManifestFiles: Record<string, ManifestFile> = {};
  const { files: manifestFiles } = manifest;
  const now = new Date();
  const minExpireDate =
    expireAfterDays !== 'never'
      ? new Date(now.getDate() - expireAfterDays)
      : now;

  // Merge old and new file keys
  const fileKeys = files.map(({ key }) => key);
  // Convert to Set -> make sure we have unique keys
  const allFiles = new Set([...fileKeys, ...Object.keys(manifestFiles)]);

  for (const fileKey of allFiles) {
    // New file
    if (!(fileKey in manifestFiles)) {
      const file = files.find(({ key }) => key === fileKey);

      newManifestFiles[fileKey] = {
        buildId: [buildId],
        eTag: file?.eTag,
      };
      continue;
    }

    const file = manifestFiles[fileKey];
    let isDeleted = false;

    // Get the files that can be expired
    const changedFile = files.find(({ key }) => key === fileKey);
    if (changedFile === undefined) {
      // If the file it is not present in the current build

      // Check if the file is already expired
      if (!file.expiredAt) {
        if (fileKey.startsWith('_next')) {
          // Treat the file as static asset that can be expired
          expire.push(fileKey);
          file.expiredAt = now.toUTCString();
        } else {
          // Treat the file as static route that should be deleted immediately
          deleted.push(fileKey);
          isDeleted = true;
        }
      }
    } else {
      // If the file already exists and is also present in the current build
      file.buildId.push(buildId);

      if (file.eTag === changedFile.eTag) {
        unchangedFiles.add(fileKey);
      } else {
        file.eTag = changedFile.eTag;
      }

      if (file.expiredAt) {
        // If the file was already expired we have to undo it
        restore.push(fileKey);
        delete file.expiredAt;
      }
    }

    // Check if a file is already expired and can be removed from the list
    if (expireAfterDays !== 'never' && file.expiredAt) {
      const fileExpirationDate = new Date(file.expiredAt);

      // It is > here instead of >= to delete files immediately when
      // `expireAfterDays` is set to 0
      if (fileExpirationDate > minExpireDate) {
        // Expire date is not yet reached
        // keep the file in the manifest
        newManifestFiles[fileKey] = file;
      }
    } else {
      if (!isDeleted) {
        newManifestFiles[fileKey] = file;
      }
    }
  }

  const newManifest = {
    ...manifest,
    currentBuild: buildId,
    files: newManifestFiles,
  };

  // Expire files
  await expireFiles(s3, bucket, expire);

  // Restore files
  await removeExpirationFromFiles(s3, bucket, restore);

  // Delete files
  await deleteFiles(s3, bucket, deleted);

  // Calculate the invalidation keys for CloudFront
  // Check from eTag which files have changed
  const changedFiles = Array.from(allFiles).filter(
    (fileKey) => !unchangedFiles.has(fileKey)
  );
  const invalidate = getInvalidationKeys(changedFiles);

  // Write the new manifest to the bucket
  await s3
    .putObject({
      Bucket: bucket,
      Key: deploymentConfigurationKey,
      Body: JSON.stringify(newManifest),
    })
    .promise();

  return { expire, restore, manifest: newManifest, invalidate, deleted };
}

export { updateManifest, getInvalidationKeys };
