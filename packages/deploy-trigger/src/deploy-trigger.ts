import { extname } from 'path';

import S3 from 'aws-sdk/clients/s3';
import unzipper from 'unzipper';
import {
  lookup as mimeLookup,
  contentType as mimeContentType,
} from 'mime-types';

import { deploymentConfigurationKey } from './constants';
import { DeploymentConfig, FileResult, LambdaDefinition } from './types';

// Metadata Key where the buildId is stored
const DEPLOYMENT_ID_META_KEY = 'tf-next-deployment-id';

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
}

interface Response {
  files: FileResult[];
  lambdas: LambdaDefinition[];
  deploymentId: string;
  deploymentConfig: DeploymentConfig;
}

async function deployTrigger({
  s3,
  key,
  sourceBucket,
  deployBucket,
}: Props): Promise<Response> {
  let deploymentConfig: DeploymentConfig | null = null;
  let deploymentId: string | undefined;
  const params = {
    Key: key,
    Bucket: sourceBucket,
  };

  // Get the deploymentId from the metadata of the package
  // If none is present, create a random id
  const zipHeaders = await s3.headObject(params).promise();

  if (zipHeaders.Metadata && DEPLOYMENT_ID_META_KEY in zipHeaders.Metadata) {
    deploymentId = zipHeaders.Metadata[DEPLOYMENT_ID_META_KEY];
  }

  if (!deploymentId) {
    throw new Error('Could not get the deployment ID from the uploaded file.');
  }

  // Get the object that triggered the event
  const zip = s3
    .getObject(params)
    .createReadStream()
    .pipe(unzipper.Parse({ forceStream: true }));

  const fileUploads: Promise<S3.ManagedUpload.SendData>[] = [];
  const lambdaUploads: Promise<S3.ManagedUpload.SendData>[] = [];

  /**
   * Unpacks a deployment zip with the following format:
   *
   * deployment.zip
   * ├── lambdas/
   * |   ├── lambda1.zip
   * |   └── lambda2.zip
   * ├── static/
   * |   ├── _next/...
   * |   └── prerendered-site
   * └── config.json
   *
   * And uploads it to the bucket in the following way:
   *
   * <deployment-id>/
   * ├── lambdas/
   * |   ├── lambda1.zip
   * |   └── lambda2.zip
   * ├── static/
   * |   ├── _next/...
   * |   └── prerendered-site
   * └── manifest.json (contains the inventory of the `<deployment-id>/` path)
   */
  for await (const e of zip) {
    const entry = e as unzipper.Entry;

    const { path: filePath, type } = entry;
    if (type === 'File') {
      let contentType: string | undefined;
      let cacheControl: string | undefined;
      let targetKey: string;

      if (filePath === 'config.json') {
        const content = await entry.buffer();
        deploymentConfig = JSON.parse(content.toString()) as DeploymentConfig;

        continue;
      } else if (filePath.startsWith('lambdas')) {
        contentType = 'application/zip';
        targetKey = `${deploymentId}/lambdas/${filePath}`;

        lambdaUploads.push(
          s3
            .upload({
              Bucket: deployBucket,
              Key: targetKey,
              Body: entry,
              ContentType: contentType,
            })
            .promise()
        );
      } else {
        const filePathWithoutPrefix = filePath.substring('static/'.length);
        targetKey = `${deploymentId}/static/${filePathWithoutPrefix}`;

        // Get ContentType
        // Static pre-rendered pages have no file extension,
        // files without extension get HTML mime type as fallback
        //
        // Explicitly use the extname here since mime treats files without
        // extension e.g. `/es` as extension => `application/ecmascript`
        const mimeType = mimeLookup(extname(filePath));
        const possibleContentType =
          typeof mimeType === 'string' ? mimeContentType(mimeType) : false;
        contentType =
          typeof possibleContentType === 'string'
            ? possibleContentType
            : 'text/html; charset=utf-8';

        // When the file is static (served from /_next/*) then it has immutable
        // client - side caching).
        // Otherwise it is only immutable on the CDN
        cacheControl = filePathWithoutPrefix.startsWith('_next/')
          ? CacheControlImmutable
          : CacheControlStatic;

        // Sorry, but you cannot override the manifest
        if (filePath !== deploymentConfigurationKey) {
          fileUploads.push(
            s3
              .upload({
                Bucket: deployBucket,
                Key: targetKey,
                Body: entry,
                ContentType: contentType,
                CacheControl: cacheControl,
              })
              .promise()
          );
        }
      }
    } else {
      entry.autodrain();
    }
  }

  const files = (await Promise.all(fileUploads)).map((obj) => {
    return { key: obj.Key, eTag: obj.ETag };
  });
  const lambdaFiles = (await Promise.all(lambdaUploads)).map((obj) => {
    return { key: obj.Key, eTag: obj.ETag };
  });

  // Cleanup
  await s3.deleteObject(params).promise();

  if (deploymentConfig === null) {
    throw new Error(
      'No deploymentConfig was found inside the uploaded package.'
    );
  }

  const lambdas: LambdaDefinition[] = [];

  for (const [key, lambda] of Object.entries(deploymentConfig.lambdas)) {
    // Find the uploaded Lambda
    const lambdaFile = lambdaFiles.find((uploadedArchive) => {
      return uploadedArchive.key.endsWith(lambda.filename);
    });

    if (lambdaFile) {
      lambdas.push({
        route: lambda.route,
        sourceKey: lambdaFile.key,
        functionName: key,
        handler: lambda.handler,
        runtime: lambda.runtime,
      });
    }
  }

  return {
    deploymentConfig,
    files,
    lambdas,
    deploymentId,
  };
}

export { DEPLOYMENT_ID_META_KEY, deployTrigger };
