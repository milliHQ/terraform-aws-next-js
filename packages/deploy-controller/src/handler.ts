import {
  createAlias,
  updateDeploymentStatus,
} from '@millihq/tfn-dynamodb-actions';
import { SNSEvent } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

import { ensureEnv } from './utils/ensure-env';
import { parseCloudFormationEvent } from './utils/parse-cloudformation-event';

const dynamoDBRegion = ensureEnv('TABLE_REGION');

const dynamoDBClient = new DynamoDB({
  region: dynamoDBRegion,
});

/**
 * Entry point for the Lambda handler.
 * Receives CloudFormation status change events from SNS.
 */
async function handler(event: SNSEvent) {
  const dynamoDBTableNameDeployments = ensureEnv('TABLE_NAME_DEPLOYMENTS');
  const dynamoDBTableNameAliases = ensureEnv('TABLE_NAME_ALIASES');

  await Promise.all(
    event.Records.map(async (record) => {
      const message = record.Sns.Message;
      const parsedEvent = parseCloudFormationEvent(message);

      const { ResourceType, ResourceStatus, StackName } = parsedEvent;

      // Only handle stack related events
      if (ResourceType !== 'AWS::CloudFormation::Stack') {
        return;
      }

      if (ResourceStatus === undefined) {
        console.error('Error: No attribute `ResourceStatus` present in event.');
        return;
      }

      if (StackName === undefined) {
        console.error('Error: No attribute `StackName` present in event.');
        return;
      }

      // Remove the `tfn-` prefix from the stack name to get the deploymentID
      const deploymentId = StackName.slice(4);

      switch (ResourceStatus) {
        case 'CREATE_COMPLETE':
          try {
            // TODO: Add the Lambdas from the Stack to the Deployment
            const deployment = await updateDeploymentStatus({
              dynamoDBClient,
              deploymentId,
              deploymentTableName: dynamoDBTableNameDeployments,
              newStatus: 'CREATE_COMPLETE',
            });

            await createAlias({
              dynamoDBClient,
              alias: `${deploymentId}.multid.milli.is`,
              isDeploymentAlias: true,
              aliasTableName: dynamoDBTableNameAliases,
              createdDate: new Date(),
              deploymentId,
              // Copy values over from the deployment
              routes: deployment.Routes,
              staticRoutes: deployment.StaticRoutes,
              prerenders: deployment.Prerenders,
            });
          } catch (error) {
            console.log('ERROR', error);
          }
          console.log('Event');
          console.log(JSON.stringify(parsedEvent, null, 2));

        case 'DELETE_COMPLETE':

        case 'CREATE_FAILED':
        // TODO: Inform about failed deployment

        default:
        // Event is not handled, since it is not relevant
      }
    })
  );
}

export { handler };
