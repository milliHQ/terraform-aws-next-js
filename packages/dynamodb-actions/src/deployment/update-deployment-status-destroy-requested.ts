import DynamoDB from 'aws-sdk/clients/dynamodb';

import { updateDeployment } from './update-deployment';

type UpdateDeploymentStatusDestroyRequested = {
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
 * Updates the status of an existing deployment to DESTROY_REQUESTED.
 *
 * @param options
 * @returns
 */
function updateDeploymentStatusDestroyRequested({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
}: UpdateDeploymentStatusDestroyRequested) {
  return updateDeployment({
    dynamoDBClient,
    deploymentTableName,
    deploymentId,
    updateAttributes: {
      Status: 'DESTROY_REQUESTED',
    },
  });
}

export { updateDeploymentStatusDestroyRequested };
