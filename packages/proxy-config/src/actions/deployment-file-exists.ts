import { CloudFrontResultResponse } from 'aws-lambda';
import { S3 } from 'aws-sdk';

import { NotFoundError } from '../errors/not-found-error';
import { splitAtCharacter } from '../utils/split-at-character';

type DeploymentFileExistsOptions = {
  s3Client: S3;
  s3BucketId: string;
  uri?: string;
};

/**
 * Checks if a file exists in the deployment bucket.
 *
 * @param options
 * @returns
 */
async function deploymentFileExists({
  s3Client,
  s3BucketId,
  uri,
}: DeploymentFileExistsOptions): Promise<CloudFrontResultResponse> {
  if (!uri) {
    throw new NotFoundError('Missing deploymentId and FileKey');
  }

  const [deploymentId, key] = splitAtCharacter(uri, '/');
  if (!deploymentId || !key) {
    throw new NotFoundError('Missing deploymentId or FileKey');
  }

  const decodedKey = decodeURIComponent(key);
  const absoluteKey = deploymentId + '/static/' + decodedKey;

  try {
    const result = await s3Client
      .headObject({
        Bucket: s3BucketId,
        Key: absoluteKey,
      })
      .promise();

    return {
      status: '200',
      body: JSON.stringify({
        status: 200,
        key: absoluteKey,
        cacheControl: result.CacheControl,
        contentType: result.ContentType,
      }),
      headers: {
        // Cache indefinitely, only reset through invalidation
        'cache-control': [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000',
          },
        ],
        'content-type': [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    };
  } catch (s3Error: any) {
    // Files that are not found in S3 return a 403 (Forbidden) status
    if (s3Error.statusCode === 403) {
      throw new NotFoundError('File does not exist');
    }

    throw s3Error;
  }
}

export { deploymentFileExists };
