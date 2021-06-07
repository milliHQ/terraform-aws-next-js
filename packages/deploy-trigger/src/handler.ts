import { S3Event, S3EventRecord, SQSEvent, SQSRecord } from 'aws-lambda';
import { S3, CloudFront, SQS } from 'aws-sdk';

import { deployTrigger } from './deploy-trigger';
import { ExpireValue } from './types';
import { updateManifest } from './update-manifest';
import { deploymentConfigurationKey } from './constants';
import { getOrCreateManifest } from './get-or-create-manifest';
import {
  createInvalidation,
  prepareInvalidations,
} from './create-invalidation';
import { generateRandomId } from './utils';

interface InvalidationSQSMessage {
  id: string;
  distributionId: string;
  retries: number;
  multiPaths: string[];
  singlePaths: string[];
}

// Default value after how many days an old deployment should be expired
const defaultExpireAfterDays = 30;

// Timeout in seconds to wait after an invalidation is send to SQS
const timeOutBetweenInvalidations = 60;

// Sets the number of retries for an invalidation
const numberOfRetriesForInvalidation = 3;

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

async function createCloudFrontInvalidation(
  incomingMultiPaths: string[],
  incomingSinglePaths: string[],
  distributionId: string,
  incomingRetries: number
) {
  let retries = incomingRetries;

  // Invalidate the paths from the CloudFront distribution
  const cloudFrontClient = new CloudFront({
    apiVersion: '2020-05-31',
  });

  const invalidationId = generateRandomId(4);
  let [InvalidationBatch, multiPaths, singlePaths] = createInvalidation(
    invalidationId,
    incomingMultiPaths,
    incomingSinglePaths
  );

  try {
    await cloudFrontClient
      .createInvalidation({
        DistributionId: distributionId,
        InvalidationBatch,
      })
      .promise();
  } catch (err) {
    console.log(err);
    if (err.code === 'TooManyInvalidationsInProgress') {
      // Send the invalidation back to the queue
      if (retries < numberOfRetriesForInvalidation) {
        console.log('Invalidation rescheduled');
        retries = retries + 1;
        multiPaths = incomingMultiPaths;
        singlePaths = incomingSinglePaths;
      }
    }
  }

  // Create SQS event if there are paths left to invalidate
  if (multiPaths.length + singlePaths.length > 0) {
    const MessageBody: InvalidationSQSMessage = {
      id: invalidationId,
      distributionId,
      multiPaths,
      singlePaths,
      retries,
    };

    const sqsClient = new SQS();

    try {
      await sqsClient
        .sendMessage({
          QueueUrl: process.env.SQS_QUEUE_URL,
          MessageBody: JSON.stringify(MessageBody),
          DelaySeconds: timeOutBetweenInvalidations,
        })
        .promise();
    } catch (err) {
      // TODO: Find way to handle errors here
      console.log(err);
    }
  }
}

/**
 * Handler of the Lambda that is invoked
 * Trigger can be one of the following:
 *   - S3 (From static upload)
 *   - SQS (Queued CloudFront invalidations)
 * @param event S3Event or SQSEvent
 */
export const handler = async function (event: S3Event | SQSEvent) {
  // SQS invokes can contain up to 10 records
  for (const Record of event.Records) {
    if ('s3' in Record) {
      // Check if S3 Record
      await s3Handler(Record);
    } else {
      await sqsHandler(Record);
    }
  }
};

async function s3Handler(Record: S3EventRecord) {
  const s3 = new S3({ apiVersion: '2006-03-01' });
  const deployBucket = process.env.TARGET_BUCKET;
  const distributionId = process.env.DISTRIBUTION_ID;
  const expireAfterDays: ExpireValue = parseExpireAfterDays();

  // Get needed information of the event
  const { object } = Record.s3;
  const { versionId, key } = object;
  const sourceBucket = Record.s3.bucket.name;

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
  const { invalidate: invalidationPaths } = await updateManifest({
    s3,
    bucket: deployBucket,
    expireAfterDays,
    files,
    buildId,
    deploymentConfigurationKey,
    manifest,
  });

  const [multiPaths, singlePaths] = prepareInvalidations(invalidationPaths);
  await createCloudFrontInvalidation(
    multiPaths,
    singlePaths,
    distributionId,
    0
  );
}

async function sqsHandler(Record: SQSRecord) {
  const body = JSON.parse(Record.body) as InvalidationSQSMessage;

  await createCloudFrontInvalidation(
    body.multiPaths,
    body.singlePaths,
    body.distributionId,
    body.retries
  );
}
