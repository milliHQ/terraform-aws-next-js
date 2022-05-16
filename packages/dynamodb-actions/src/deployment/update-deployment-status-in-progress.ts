import DynamoDB from 'aws-sdk/clients/dynamodb';

import { updateItem } from '../utils/dynamodb';
import { getDeploymentById } from './get-deployment-by-id';

type UpdateDeploymentStatusInProgressOptions = {
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
   * Stringified JSON object that contains routes that are served from
   * prerendered generated HTML files.
   */
  prerenders: string;
  /**
   * Stringified JSON object that contains the route config.
   */
  routes: string;
};

/**
 * Updates the status of an existing deployment in the database.
 *
 * @param options
 * @returns
 */
async function updateDeploymentStatusInProgress({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  prerenders,
  routes,
}: UpdateDeploymentStatusInProgressOptions) {
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
      Status: 'CREATE_IN_PROGRESS',
      // Lambda routes are empty at the creation of the stack since they
      // can only be determined when the stack creation is finished and the
      // endpoints of API Gateway or function URLs can be resolved.
      LambdaRoutes: '{}',
      Prerenders: prerenders,
      Routes: routes,
    },
  });
}

export { updateDeploymentStatusInProgress };
