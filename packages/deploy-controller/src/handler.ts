import { SNSEvent } from 'aws-lambda';
import DynamoDB from 'aws-sdk/clients/dynamodb';

import { ensureEnv } from './utils/ensure-env';
import { createController } from './controller';

const dynamoDBRegion = ensureEnv('TABLE_REGION');

const dynamoDBClient = new DynamoDB({
  region: dynamoDBRegion,
});

const controller = createController({
  dynamoDBClient,
});

/**
 * Entry point for the Lambda handler.
 * Receives CloudFormation status change events from SNS.
 */
async function handler(event: SNSEvent) {
  const dynamoDBTableNameDeployments = ensureEnv('TABLE_NAME_DEPLOYMENTS');
  const dynamoDBTableNameAliases = ensureEnv('TABLE_NAME_ALIASES');

  try {
    await controller.run(event, {
      aliasTableName: dynamoDBTableNameAliases,
      deploymentTableName: dynamoDBTableNameDeployments,
    });
  } catch (error) {
    console.error(error);
  }
}

export { handler };
