import DynamoDB from 'aws-sdk/clients/dynamodb';

import { DeploymentItem } from '../types';
import { getDeploymentById } from './get-deployment-by-id';

const { unmarshall } = DynamoDB.Converter;

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
   * Id of the deployment that should be deleted.
   */
  deploymentId: string | { PK: string; SK: string };
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
  let PK: string;
  let SK: string;

  if (typeof deploymentId === 'string') {
    const deploymentToDelete = await getDeploymentById({
      dynamoDBClient,
      deploymentTableName,
      deploymentId,
    });

    if (!deploymentToDelete) {
      return null;
    }

    PK = deploymentToDelete.PK;
    SK = deploymentToDelete.SK;
  } else {
    PK = deploymentId.PK;
    SK = deploymentId.SK;
  }

  const deleteCommandResponse = await dynamoDBClient
    .deleteItem({
      TableName: deploymentTableName,
      Key: {
        PK: {
          S: PK,
        },
        SK: {
          S: SK,
        },
      },
      ReturnValues: 'ALL_OLD',
    })
    .promise();

  if (
    deleteCommandResponse.$response.error ||
    !deleteCommandResponse.Attributes
  ) {
    return null;
  }

  return unmarshall(deleteCommandResponse.Attributes) as DeploymentItem;
}

export { deleteDeploymentById };
