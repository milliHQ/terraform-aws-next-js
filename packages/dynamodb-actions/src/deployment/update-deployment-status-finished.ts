import DynamoDB from 'aws-sdk/clients/dynamodb';

import { updateItem } from '../utils/dynamodb';
import { getDeploymentById } from './get-deployment-by-id';

type UpdateDeploymentStatusFinishedOptions = {
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
   * The alias that is assigned with this deployment.
   */
  deploymentAlias?: string;
};

/**
 * Updates the status of an existing deployment to finished state.
 *
 * @param options
 * @returns
 */
async function updateDeploymentStatusFinished({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  deploymentAlias,
}: UpdateDeploymentStatusFinishedOptions) {
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
      DeploymentAlias: deploymentAlias,
      Status: 'FINISHED',
    },
  });
}

export { updateDeploymentStatusFinished };
