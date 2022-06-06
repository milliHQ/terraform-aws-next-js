import {
  updateDeploymentStatusCreateInProgress,
  getDeploymentById,
  updateDeploymentStatusCreateFailed,
  updateDeploymentStatusFinished,
  reverseHostname,
  createAlias,
} from '@millihq/tfn-dynamodb-actions';
import { S3Event, S3EventRecord, SQSEvent, SQSRecord } from 'aws-lambda';
import CloudFront from 'aws-sdk/clients/cloudfront';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import S3 from 'aws-sdk/clients/s3';
import SQS from 'aws-sdk/clients/sqs';

import { deployTrigger } from './deploy-trigger';
import { ExpireValue } from './types';
import { updateManifest } from './update-manifest';
import { deploymentConfigurationKey } from './constants';
import { getOrCreateManifest } from './get-or-create-manifest';
import {
  createInvalidation,
  prepareInvalidations,
} from './create-invalidation';
import { ensureEnv } from './utils/ensure-env';
import { generateRandomId } from './utils/random-id';
import { AtomicDeploymentAPIGateway } from './cdk/aws-construct';
import { AtomicDeploymentFunctionUrls } from './cdk/aws-construct-function-urls';
import { createCloudFormationStack } from './cdk/create-cloudformation-stack';

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
  } catch (error) {
    const err = error as any;

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
  const dynamoDBRegion = ensureEnv('TABLE_REGION');
  const dynamoDBTableNameDeployments = ensureEnv('TABLE_NAME_DEPLOYMENTS');
  const dynamoDBTableNameAliases = ensureEnv('TABLE_NAME_ALIASES');

  const dynamoDBClient = new DynamoDB({
    region: dynamoDBRegion,
  });

  let s3: S3;
  // Only for testing purposes when connecting against a local S3 backend
  if (process.env.__DEBUG__USE_LOCAL_BUCKET) {
    s3 = new S3(JSON.parse(process.env.__DEBUG__USE_LOCAL_BUCKET));
  } else {
    s3 = new S3({ apiVersion: '2006-03-01' });
  }
  const deployBucket = process.env.TARGET_BUCKET;
  const distributionId = process.env.DISTRIBUTION_ID;
  const expireAfterDays: ExpireValue = parseExpireAfterDays();

  // Get needed information of the event
  const { object } = Record.s3;
  const { key } = object;
  const sourceBucket = Record.s3.bucket.name;

  const manifest = await getOrCreateManifest(
    s3,
    deployBucket,
    deploymentConfigurationKey
  );

  // Unpack the package to S3
  const { files, deploymentId, lambdas, deploymentConfig } =
    await deployTrigger({
      s3,
      sourceBucket,
      deployBucket,
      key,
    });

  // Get the deployment from the Database
  const deployment = await getDeploymentById({
    dynamoDBClient,
    deploymentTableName: dynamoDBTableNameDeployments,
    deploymentId,
  });

  if (!deployment) {
    throw new Error(
      `Deployment with id ${deploymentId} could not be found in database.`
    );
    // TODO: Cleanup extracted files from S3
  }

  // Static deployment, doesn't need a CloudFormation template
  if (lambdas.length === 0) {
    const lambdaRoutes = '{}';
    const routes = JSON.stringify(deploymentConfig.routes);
    const prerenders = JSON.stringify(deploymentConfig.prerenders);

    // TODO: Handle case when multi deployments is not enabled
    const deploymentAliasBasePath = '/';
    const deploymentAliasHostname =
      deploymentId + process.env.MULTI_DEPLOYMENTS_BASE_DOMAIN;
    const deploymentAliasHostnameRev = reverseHostname(deploymentAliasHostname);
    await createAlias({
      dynamoDBClient,
      hostnameRev: deploymentAliasHostnameRev,
      isDeploymentAlias: true,
      aliasTableName: dynamoDBTableNameAliases,
      createDate: new Date(),
      deploymentId,
      lambdaRoutes,
      routes,
      prerenders,
      basePath: deploymentAliasBasePath,
    });

    await updateDeploymentStatusFinished({
      dynamoDBClient,
      deploymentTableName: dynamoDBTableNameDeployments,
      deploymentId,
      routes,
      prerenders,
      lambdaRoutes,
      deploymentAlias: deploymentAliasHostname + deploymentAliasBasePath,
    });
  } else {
    // Create the CloudFormation stack for the lambdas
    const atomicDeployment =
      deployment.DeploymentTemplate === 'API_GATEWAY'
        ? new AtomicDeploymentAPIGateway({
            deploymentId,
            deploymentBucketId: deployBucket,
            lambdas: lambdas,
          })
        : new AtomicDeploymentFunctionUrls({
            deploymentId,
            deploymentBucketId: deployBucket,
            lambdas: lambdas,
          });

    try {
      const stackName = `tfn-${deploymentId}`;
      const { stackARN } = await createCloudFormationStack({
        notificationARNs: [process.env.DEPLOY_STATUS_SNS_ARN],
        stack: atomicDeployment,
        // Stackname has to match [a-zA-Z][-a-zA-Z0-9]*
        stackName,
        cloudFormationRoleArn: process.env.CLOUDFORMATION_ROLE_ARN,
      });

      // TODO: Move this to the deployment controller
      await updateDeploymentStatusCreateInProgress({
        dynamoDBClient,
        deploymentTableName: dynamoDBTableNameDeployments,
        deploymentId,
        routes: JSON.stringify(deploymentConfig.routes),
        prerenders: JSON.stringify(deploymentConfig.prerenders),
        cloudFormationStack: stackARN,
      });
    } catch (error) {
      console.error(error);
      await updateDeploymentStatusCreateFailed({
        dynamoDBClient,
        deploymentTableName: dynamoDBTableNameDeployments,
        deploymentId,
      });
    }
  }

  // Update the manifest
  const { invalidate: invalidationPaths } = await updateManifest({
    s3,
    bucket: deployBucket,
    expireAfterDays,
    files,
    buildId: deploymentId,
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
