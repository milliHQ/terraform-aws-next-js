import { DynamoDB } from 'aws-sdk';

import { updateItem } from '../utils/dynamodb';
import { getDeploymentById } from './get-deployment-by-id';

type UpdateDeploymentStatusOptions = {
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
  deploymentId: string;
  /**
   * Stringified routing table for Lambdas
   */
  lambdaRoutes: string;
  /**
   * The new status that.
   */
  newStatus: string;
};

/**
 * Updates the status of an existing deployment in the database.
 *
 * @param options
 * @returns
 */
async function updateDeploymentStatus({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  lambdaRoutes,
  newStatus,
}: UpdateDeploymentStatusOptions) {
  const deployment = await getDeploymentById({
    dynamoDBClient,
    deploymentId,
    deploymentTableName,
  });

  if (!deployment) {
    throw new Error(`Deployment does not exist: "${deploymentId}"`);
  }

  return updateItem({
    client: dynamoDBClient,
    tableName: deploymentTableName,
    key: {
      PK: deployment.PK,
      SK: deployment.SK,
    },
    item: {
      Status: newStatus,
      LambdaRoutes: lambdaRoutes,
    },
  });
}

export { updateDeploymentStatus };
