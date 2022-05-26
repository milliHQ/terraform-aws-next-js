import {
  createAlias,
  reverseHostname,
  updateDeploymentStatus,
  updateDeploymentStatusFinished,
} from '@millihq/tfn-dynamodb-actions';
import { SNSEvent } from 'aws-lambda';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import CloudFormation from 'aws-sdk/clients/cloudformation';

import { ensureEnv } from './utils/ensure-env';
import { parseCloudFormationEvent } from './utils/parse-cloudformation-event';
import { parseLambdaRoutes } from './utils/parse-lambda-routes';

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
            const stackARN = parsedEvent.StackId;
            if (!stackARN) {
              throw new Error('No StackId present');
            }

            const cloudformationClient = new CloudFormation();
            // Get the stack that triggered the event
            const stacksResponse = await cloudformationClient
              .describeStacks({
                StackName: stackARN,
              })
              .promise();

            if (!stacksResponse.Stacks || stacksResponse.Stacks.length !== 1) {
              throw new Error('Could not retrieve stack with id: ' + stackARN);
            }

            const stack = stacksResponse.Stacks[0];
            const lambdaRoutesStackOutput = stack.Outputs?.find(
              ({ OutputKey }) => OutputKey === 'lambdaRoutes'
            );

            console.log({ stack: JSON.stringify(stack, null, 2) });

            let lambdaRoutes: Record<string, string> = {};
            if (
              lambdaRoutesStackOutput &&
              lambdaRoutesStackOutput.OutputValue
            ) {
              lambdaRoutes = parseLambdaRoutes(
                lambdaRoutesStackOutput.OutputValue
              );
            }

            const stringifiedLambdaRoutes = JSON.stringify(lambdaRoutes);

            const deployment = await updateDeploymentStatus({
              dynamoDBClient,
              deploymentId,
              deploymentTableName: dynamoDBTableNameDeployments,
              lambdaRoutes: stringifiedLambdaRoutes,
              newStatus: 'CREATE_COMPLETE',
            });

            // TODO: Handle case when multi deployments is not enabled
            const deploymentAliasBasePath = '/';
            const deploymentAliasHostname =
              deploymentId + process.env.MULTI_DEPLOYMENTS_BASE_DOMAIN;
            const deploymentAliasHostnameRev = reverseHostname(
              deploymentId + process.env.MULTI_DEPLOYMENTS_BASE_DOMAIN
            );
            await createAlias({
              dynamoDBClient,
              hostnameRev: deploymentAliasHostnameRev,
              isDeploymentAlias: true,
              aliasTableName: dynamoDBTableNameAliases,
              createDate: new Date(),
              deploymentId,
              lambdaRoutes: stringifiedLambdaRoutes,
              // Copy values over from the deployment
              routes: deployment.Routes,
              prerenders: deployment.Prerenders,
              basePath: deploymentAliasBasePath,
            });

            await updateDeploymentStatusFinished({
              dynamoDBClient,
              deploymentId,
              deploymentTableName: dynamoDBTableNameDeployments,
              deploymentAlias:
                deploymentAliasHostname + deploymentAliasBasePath,
            });
          } catch (error) {
            console.log('ERROR', error);
          }

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
