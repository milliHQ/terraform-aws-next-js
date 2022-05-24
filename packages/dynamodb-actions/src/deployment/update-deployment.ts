import DynamoDB from 'aws-sdk/clients/dynamodb';

import { DeploymentItem } from '../types';
import { updateItem } from '../utils/dynamodb';
import { getDeploymentById } from './get-deployment-by-id';

type UpdateDeploymentOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the deployments.
   */
  deploymentTableName: string;
  /**
   * ID of the deployment to update.
   */
  deploymentId: string | { PK: string; SK: string };
  /**
   * Attributes that should be updated.
   */
  updateAttributes: Partial<DeploymentItem>;
};

/**
 * Updates the status of an existing deployment to DESTROY_IN_PROGRESS.
 *
 * @param options
 * @returns
 */
async function updateDeployment({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  updateAttributes,
}: UpdateDeploymentOptions): Promise<DeploymentItem> {
  let PK: string;
  let SK: string;

  if (typeof deploymentId === 'string') {
    const deploymentToUpdate = await getDeploymentById({
      dynamoDBClient,
      deploymentId,
      deploymentTableName,
    });

    if (!deploymentToUpdate) {
      throw new Error(`Deployment does not exist: "${deploymentId}"`);
    }

    PK = deploymentToUpdate.PK;
    SK = deploymentToUpdate.SK;
  } else {
    PK = deploymentId.PK;
    SK = deploymentId.SK;
  }

  return updateItem({
    client: dynamoDBClient,
    tableName: deploymentTableName,
    key: {
      PK: PK,
      SK: SK,
    },
    item: updateAttributes,
  }) as unknown as DeploymentItem;
}

export { updateDeployment };
