import DynamoDB from 'aws-sdk/clients/dynamodb';

import { updateDeployment } from './update-deployment';

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
  deploymentId: string | { PK: string; SK: string };
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
function updateDeploymentStatusFinished({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  deploymentAlias,
}: UpdateDeploymentStatusFinishedOptions) {
  return updateDeployment({
    dynamoDBClient,
    deploymentTableName,
    deploymentId,
    updateAttributes: {
      DeploymentAlias: deploymentAlias,
      Status: 'FINISHED',
    },
  });
}

export { updateDeploymentStatusFinished };
