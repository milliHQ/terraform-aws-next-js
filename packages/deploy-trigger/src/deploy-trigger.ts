import { S3 } from 'aws-sdk';
import unzipper from 'unzipper';
import {
  lookup as mimeLookup,
  contentType as mimeContentType,
} from 'mime-types';

import { deploymentConfigurationKey } from './constants';
import { generateRandomBuildId } from './utils';
import { FileResult } from './types';

// Metadata Key where the buildId is stored
const BuildIdMetaDataKey = 'x-amz-meta-tf-next-build-id';

/**
 * Cache control header for immutable files that are stored in _next/static
 */
const CacheControlImmutable = 'public,max-age=31536000,immutable';

/**
 * Static files that have no hashed filenames
 *
 * Must be refetched by the browser every time (max-age=0).
 * But CloudFront CDN can hold the copy infinite time until a invalidation
 * removes it (s-maxage=31536000).
 * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html#ExpirationDownloadDist
 */
const CacheControlStatic = 'public,max-age=0,must-revalidate,s-maxage=31536000';

interface Props {
  s3: S3;
  sourceBucket: string;
  deployBucket: string;
  key: string;
  versionId?: string;
}

interface Response {
  files: FileResult[];
  buildId: string;
}

export async function deployTrigger({
  s3,
  key,
  sourceBucket,
  deployBucket,
  versionId,
}: Props): Promise<Response> {
  let buildId = '';
  const params = {
    Key: key,
    Bucket: sourceBucket,
    VersionId: versionId,
  };

  // Get the buildId from the metadata of the package
  // If none is present, create a random id
  const zipHeaders = await s3.headObject(params).promise();

  if (zipHeaders.Metadata && BuildIdMetaDataKey in zipHeaders.Metadata) {
    buildId = zipHeaders.Metadata[BuildIdMetaDataKey];
  } else if (zipHeaders.ETag) {
    // Fallback 1: If no metadata is present, use the etag
    buildId = zipHeaders.ETag;
  } else {
    // Fallback 2: If no metadata or etag is present, create random id
    buildId = generateRandomBuildId();
  }

  // Get the object that triggered the event
  const zip = s3
    .getObject(params)
    .createReadStream()
    .pipe(unzipper.Parse({ forceStream: true }));

  const uploads: Promise<S3.ManagedUpload.SendData>[] = [];

  for await (const e of zip) {
    const entry = e as unzipper.Entry;

    const fileName = entry.path;
    const type = entry.type;
    if (type === 'File') {
      // Get ContentType
      // Static pre-rendered pages have no file extension,
      // files without extension get HTML mime type as fallback
      const mimeType = mimeLookup(fileName);
      const contentType =
        typeof mimeType === 'string' ? mimeContentType(mimeType) : false;

      // When the file is static (served from /_next/*) then it has immutable
      // client - side caching).
      // Otherwise it is only immutable on the CDN
      const cacheControl = fileName.startsWith('_next/')
        ? CacheControlImmutable
        : CacheControlStatic;

      const uploadParams: S3.Types.PutObjectRequest = {
        Bucket: deployBucket,
        Key: fileName,
        Body: entry,
        ContentType:
          typeof contentType === 'string'
            ? contentType
            : 'text/html; charset=utf-8',
        CacheControl: cacheControl,
      };

      // Sorry, but you cannot override the manifest
      if (fileName !== deploymentConfigurationKey) {
        uploads.push(s3.upload(uploadParams).promise());
      }
    } else {
      entry.autodrain();
    }
  }

  const files = (await Promise.all(uploads)).map((obj) => {
    return { key: obj.Key, eTag: obj.ETag };
  });

  // Cleanup
  await s3.deleteObject(params).promise();

  return {
    files,
    buildId,
  };
}
