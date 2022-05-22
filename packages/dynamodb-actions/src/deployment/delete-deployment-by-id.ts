import DynamoDB from 'aws-sdk/clients/dynamodb';

import { DeploymentItem } from '../types';
import { getDeploymentById } from './get-deployment-by-id';

type DeleteDeploymentByIdOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the deployments.
   */
  deploymentTableName: string;
  /**
   * Id of the deployment.
   */
  deploymentId: string;
};

/**
 * Deletes a deployment by id.
 * Returns null when no deployment with the given id could be found.
 * @param options
 * @returns
 */
async function deleteDeploymentById({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
}: DeleteDeploymentByIdOptions): Promise<DeploymentItem | null> {
  const deploymentToDelete = await getDeploymentById({
    dynamoDBClient,
    deploymentTableName,
    deploymentId,
  });

  if (!deploymentToDelete) {
    return null;
  }

  const deleteCommandResponse = await dynamoDBClient
    .deleteItem({
      TableName: deploymentTableName,
      Key: {
        PK: {
          S: deploymentToDelete.PK,
        },
        SK: {
          S: deploymentToDelete.SK,
        },
      },
    })
    .promise();

  if (deleteCommandResponse.$response.error) {
    throw deleteCommandResponse.$response.error;
  }

  return deploymentToDelete;
}

export { deleteDeploymentById };
