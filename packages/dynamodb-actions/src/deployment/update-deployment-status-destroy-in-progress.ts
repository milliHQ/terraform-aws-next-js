import DynamoDB from 'aws-sdk/clients/dynamodb';

import { updateDeployment } from './update-deployment';

type UpdateDeploymentStatusDestroyInProgress = {
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
 * Updates the status of an existing deployment to DESTROY_IN_PROGRESS.
 *
 * @param options
 * @returns
 */
function updateDeploymentStatusDestroyInProgress({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
}: UpdateDeploymentStatusDestroyInProgress) {
  return updateDeployment({
    dynamoDBClient,
    deploymentTableName,
    deploymentId,
    updateAttributes: {
      Status: 'DESTROY_IN_PROGRESS',
    },
  });
}

export { updateDeploymentStatusDestroyInProgress };
