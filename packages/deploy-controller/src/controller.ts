import {
  createAlias,
  deleteDeploymentById,
  reverseHostname,
  updateDeploymentStatus,
  updateDeploymentStatusFinished,
  updateDeploymentStatusCreateFailed,
  updateDeploymentStatusDestroyInProgress,
  updateDeploymentStatusDestroyFailed,
} from '@millihq/tfn-dynamodb-actions';
import { SNSEvent } from 'aws-lambda';
import CloudFormation from 'aws-sdk/clients/cloudformation';
import DynamoDB from 'aws-sdk/clients/dynamodb';

import { parseCloudFormationEvent } from './utils/parse-cloudformation-event';
import { parseLambdaRoutes } from './utils/parse-lambda-routes';

type ControllerOptions = {
  dynamoDBClient: DynamoDB;
  cloudFormationClient?: CloudFormation;
};

type RuntimeOptions = {
  aliasTableName: string;
  deploymentTableName: string;
};

class Controller {
  cloudFormationClient: CloudFormation;
  dynamoDBClient: DynamoDB;

  constructor({ dynamoDBClient, cloudFormationClient }: ControllerOptions) {
    this.cloudFormationClient = cloudFormationClient ?? new CloudFormation();
    this.dynamoDBClient = dynamoDBClient;
  }

  run = async (
    event: SNSEvent,
    { aliasTableName, deploymentTableName }: RuntimeOptions
  ) => {
    await Promise.all(
      event.Records.map(async (record) => {
        const message = record.Sns.Message;
        const parsedEvent = parseCloudFormationEvent(message);

        const { ResourceType, ResourceStatus, StackName } = parsedEvent;

        // Only handle stack related events
        if (ResourceType !== 'AWS::CloudFormation::Stack') {
          return;
        }

        if (typeof ResourceStatus !== 'string') {
          throw new Error('No attribute `ResourceStatus` present in event');
        }

        if (typeof StackName !== 'string') {
          throw new Error('No attribute `StackName` present in event');
        }

        // Remove the `tfn-` prefix from the stack name to get the deploymentID
        const deploymentId = StackName.slice(4);

        /**
         * The following values for resource status are possible:
         * {@link CloudFormation.StackStatus}
         */
        switch (ResourceStatus) {
          case 'CREATE_COMPLETE':
            const stackARN = parsedEvent.StackId;
            if (!stackARN) {
              throw new Error('CreateComplete: No StackId present');
            }

            // Get the stack that triggered the event
            const stacksResponse = await this.cloudFormationClient
              .describeStacks({
                StackName: stackARN,
              })
              .promise();

            if (!stacksResponse.Stacks || stacksResponse.Stacks.length !== 1) {
              throw new Error(
                'CreateComplete: Could not retrieve stack with id: ' + stackARN
              );
            }

            const stack = stacksResponse.Stacks[0];
            const lambdaRoutesStackOutput = stack.Outputs?.find(
              ({ OutputKey }) => OutputKey === 'lambdaRoutes'
            );

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
              dynamoDBClient: this.dynamoDBClient,
              deploymentId,
              deploymentTableName,
              lambdaRoutes: stringifiedLambdaRoutes,
              newStatus: 'CREATE_COMPLETE',
            });

            // TODO: Handle case when multi deployments is not enabled
            const deploymentAliasBasePath = '/';
            const deploymentAliasHostname =
              deploymentId + process.env.MULTI_DEPLOYMENTS_BASE_DOMAIN;
            const deploymentAliasHostnameRev = reverseHostname(
              deploymentAliasHostname
            );
            await createAlias({
              dynamoDBClient: this.dynamoDBClient,
              hostnameRev: deploymentAliasHostnameRev,
              isDeploymentAlias: true,
              aliasTableName,
              createDate: new Date(),
              deploymentId,
              lambdaRoutes: stringifiedLambdaRoutes,
              // Copy values over from the deployment
              routes: deployment.Routes,
              prerenders: deployment.Prerenders,
              basePath: deploymentAliasBasePath,
            });

            await updateDeploymentStatusFinished({
              dynamoDBClient: this.dynamoDBClient,
              deploymentId,
              deploymentTableName,
              deploymentAlias:
                deploymentAliasHostname + deploymentAliasBasePath,
            });
            break;

          case 'CREATE_FAILED':
            await updateDeploymentStatusCreateFailed({
              dynamoDBClient: this.dynamoDBClient,
              deploymentTableName,
              deploymentId,
            });
            break;

          case 'DELETE_COMPLETE':
            await deleteDeploymentById({
              dynamoDBClient: this.dynamoDBClient,
              deploymentTableName,
              deploymentId,
            });
            break;

          case 'DELETE_IN_PROGRESS':
            await updateDeploymentStatusDestroyInProgress({
              dynamoDBClient: this.dynamoDBClient,
              deploymentTableName,
              deploymentId,
            });
            break;

          case 'DELETE_FAILED':
            await updateDeploymentStatusDestroyFailed({
              dynamoDBClient: this.dynamoDBClient,
              deploymentTableName,
              deploymentId,
            });
            break;

          default:
          // Event is not handled, since it is not relevant
        }
      })
    );
  };
}

function createController(options: ControllerOptions) {
  return new Controller(options);
}

export type { Controller };
export { createController };
