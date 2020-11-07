import { S3Handler } from 'aws-lambda';
import { S3 } from 'aws-sdk';

import { deployTrigger } from './deploy-trigger';
import { ExpireValue } from './types';
import { updateManifest } from './update-manifest';
import { deploymentConfigurationKey } from './constants';
import { getOrCreateManifest } from './get-or-create-manifest';
import { createInvalidation } from './create-invalidation';

// Default value after how many days an old deployment should be expired
const defaultExpireAfterDays = 30;

function parseExpireAfterDays() {
  if (process.env.EXPIRE_AFTER_DAYS) {
    if (process.env.EXPIRE_AFTER_DAYS === 'never') {
      return 'never';
    }

    // Parse to int
    try {
      const days = Number(process.env.EXPIRE_AFTER_DAYS);
      if (days >= 0) {
        return days;
      }

      return 'never';
    } catch (err) {
      return defaultExpireAfterDays;
    }
  }

  return defaultExpireAfterDays;
}

export const handler: S3Handler = async function (event) {
  const s3 = new S3({ apiVersion: '2006-03-01' });
  const deployBucket = process.env.TARGET_BUCKET;
  const distributionId = process.env.DISTRIBUTION_ID;
  const expireAfterDays: ExpireValue = parseExpireAfterDays();

  // Get needed information of the event
  const { object } = event.Records[0].s3;
  const { versionId, key } = object;
  const sourceBucket = event.Records[0].s3.bucket.name;

  const manifest = await getOrCreateManifest(
    s3,
    deployBucket,
    deploymentConfigurationKey
  );

  // Unpack the package
  const { files, buildId } = await deployTrigger({
    s3,
    sourceBucket,
    deployBucket,
    key,
    versionId,
  });

  // Update the manifest
  const { invalidate } = await updateManifest({
    s3,
    bucket: deployBucket,
    expireAfterDays,
    files,
    buildId,
    deploymentConfigurationKey,
    manifest,
  });

  // Invalidate the paths from the CloudFront distribution
  await createInvalidation(distributionId, invalidate);
};
