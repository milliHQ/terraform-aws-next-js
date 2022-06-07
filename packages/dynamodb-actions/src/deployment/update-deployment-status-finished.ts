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
  /**
   * Only used for static deployments.
   * Stringified JSON object that contains routes that are served from
   * prerendered generated HTML files.
   *
   */
  prerenders?: string;
  /**
   * Only used for static deployments.
   * Stringified JSON object that contains the route config.
   */
  routes?: string;
  /**
   * Only used for static deployments.
   * Stringified routing table for Lambdas
   */
  lambdaRoutes?: string;
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
  prerenders,
  routes,
  lambdaRoutes,
}: UpdateDeploymentStatusFinishedOptions) {
  return updateDeployment({
    dynamoDBClient,
    deploymentTableName,
    deploymentId,
    updateAttributes: {
      DeploymentAlias: deploymentAlias,
      Status: 'FINISHED',
      LambdaRoutes: lambdaRoutes,
      Prerenders: prerenders,
      Routes: routes,
    },
  });
}

export { updateDeploymentStatusFinished };
