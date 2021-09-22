import { S3Event, S3EventRecord, SQSEvent, SQSRecord } from 'aws-lambda';
import { S3, CloudFront, SQS } from 'aws-sdk';
import unzipper from 'unzipper';
import { inspect } from 'util';
import { deployTrigger } from './deploy-trigger';
import { ExpireValue } from './types';
import { updateManifest } from './update-manifest';
import { deploymentConfigurationKey } from './constants';
import { getOrCreateManifest } from './get-or-create-manifest';
import createDeployment from './create-deployment';
import deleteDeployments from './delete-deployments';
import {
  createInvalidation,
  prepareInvalidations,
} from './create-invalidation';
import {
  generateRandomId,
  readEnvConfig,
  readConfigFile,
  readLambdas,
} from './utils';

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
  } catch (err: any) {
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
  let s3: S3;
  // Only for testing purposes when connecting against a local S3 backend
  if (process.env.__DEBUG__USE_LOCAL_BUCKET) {
    s3 = new S3(JSON.parse(process.env.__DEBUG__USE_LOCAL_BUCKET));
  } else {
    s3 = new S3({ apiVersion: '2006-03-01' });
  }
  const deployBucket = process.env.TARGET_BUCKET;
  const distributionId = process.env.DISTRIBUTION_ID;
  const staticFilesArchive = process.env.STATIC_FILES_ARCHIVE;
  const deploymentFile = process.env.DEPLOYMENT_FILE;
  const deleteDeploymentFile = process.env.DELETE_DEPLOYMENT_FILE;

  // Get needed information of the event
  const { object } = Record.s3;
  const { versionId, key } = object;
  const sourceBucket = Record.s3.bucket.name;

  // We upload the static files archive and a deployment zip to the source bucket.
  // The deployment zip contains the config file and the lambdas. We then upload the
  // static files to the deploy bucket and create the deployment infra based on the
  // lambdas and config file.
  if (key === staticFilesArchive) {
    await staticFilesOnS3(s3, deployBucket, sourceBucket, key, distributionId, versionId);
    console.log(`Uploaded static files to ${deployBucket}`);
  } else if (key === deleteDeploymentFile) {
    const response = await deleteDeploymentFileOnS3(
      s3,
      sourceBucket,
      key,
      versionId,
    );
    console.log(`Deleted deployment(s) ${response}`);
  } else if (key === deploymentFile) {
    const deploymentId = await deploymentFileOnS3(
      s3,
      sourceBucket,
      key,
      versionId,
    );
    console.log(`Created deployment ${deploymentId}`);
  } else {
    console.log(`Received unexpected file: ${key}`);
  }
}

async function deleteDeploymentFileOnS3(
  s3: S3,
  sourceBucket: string,
  key: string,
  versionId?: string,
) {
  let whatToDelete: any = undefined;

  const file = await s3.getObject({
    Key: key,
    Bucket: sourceBucket,
    VersionId: versionId,
  }).promise();

  if (!file.Body) {
    throw new Error(`Could not read body of ${key}`);
  }

  try {
    whatToDelete = JSON.parse(file.Body.toString());
  } catch (err) {
    console.error(`Could not parse ${key}: ${inspect(err)}`);
    throw err;
  }

  const response = await deleteDeployments({
    config: readEnvConfig(),
    whatToDelete,
  });

  // Cleanup
  await s3.deleteObject({
    Key: key,
    Bucket: sourceBucket,
    VersionId: versionId,
  }).promise();

  return response;
}

async function deploymentFileOnS3(
  s3: S3,
  sourceBucket: string,
  key: string,
  versionId?: string,
) {
  const directory = await unzipper.Open.s3(s3, { Bucket: sourceBucket, Key: key });
  const configFile = await readConfigFile(directory.files, key);

  if (!configFile.deploymentId) {
    throw new Error(`Config does not contain deploymentId: ${inspect(configFile)}`);
  }

  const lambdas = await readLambdas(directory.files);
  const config = readEnvConfig();

  await createDeployment({
    deploymentId: configFile.deploymentId,
    lambdas,
    config,
    configFile,
  });

  // Cleanup
  await s3.deleteObject({
    Key: key,
    Bucket: sourceBucket,
    VersionId: versionId,
  }).promise();

  return configFile.deploymentId;
}

async function staticFilesOnS3(
  s3: S3,
  deployBucket: string,
  sourceBucket: string,
  key: string,
  distributionId: string,
  versionId?: string,
) {
  const expireAfterDays: ExpireValue = parseExpireAfterDays();

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

  // Allow skipping the creation of the invalidation for local e2e tests
  if (!process.env.__DEBUG__SKIP_INVALIDATIONS) {
    const [multiPaths, singlePaths] = prepareInvalidations(invalidationPaths);
    await createCloudFrontInvalidation(
      multiPaths,
      singlePaths,
      distributionId,
      0
    );
  }
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
