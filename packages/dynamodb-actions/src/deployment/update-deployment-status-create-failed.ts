import DynamoDB from 'aws-sdk/clients/dynamodb';

import { updateDeployment } from './update-deployment';

type UpdateDeploymentStatusCreateFailed = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the deployments.
   */
  deploymentTableName: string;
  /**
   * ID of the deployment.
   */
  deploymentId: string | { PK: string; SK: string };
};

/**
 * Updates the status of an existing deployment to create failed state.
 *
 * @param options
 * @returns
 */
function updateDeploymentStatusCreateFailed({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
}: UpdateDeploymentStatusCreateFailed) {
  return updateDeployment({
    dynamoDBClient,
    deploymentTableName,
    deploymentId,
    updateAttributes: {
      Status: 'CREATE_FAILED',
    },
  });
}

export { updateDeploymentStatusCreateFailed };
