import DynamoDB from 'aws-sdk/clients/dynamodb';

import { updateDeployment } from './update-deployment';

type UpdateDeploymentStatusDestroyFailed = {
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
 * Updates the status of an existing deployment to DESTROY_FAILED.
 *
 * @param options
 * @returns
 */
function updateDeploymentStatusDestroyFailed({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
}: UpdateDeploymentStatusDestroyFailed) {
  return updateDeployment({
    dynamoDBClient,
    deploymentTableName,
    deploymentId,
    updateAttributes: {
      Status: 'DESTROY_FAILED',
    },
  });
}

export { updateDeploymentStatusDestroyFailed };
