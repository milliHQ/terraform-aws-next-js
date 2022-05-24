import DynamoDB from 'aws-sdk/clients/dynamodb';

import { updateDeployment } from './update-deployment';

type UpdateDeploymentStatusCreateInProgressOptions = {
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
   * The CloudFormation stack ARN that is associated with this deployment.
   */
  cloudFormationStack: string;
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
function updateDeploymentStatusCreateInProgress({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  cloudFormationStack,
  prerenders,
  routes,
}: UpdateDeploymentStatusCreateInProgressOptions) {
  return updateDeployment({
    dynamoDBClient,
    deploymentTableName,
    deploymentId,
    updateAttributes: {
      Status: 'CREATE_IN_PROGRESS',
      // Lambda routes are empty at the creation of the stack since they
      // can only be determined when the stack creation is finished and the
      // endpoints of API Gateway or function URLs can be resolved.
      LambdaRoutes: '{}',
      Prerenders: prerenders,
      Routes: routes,
      CFStack: cloudFormationStack,
    },
  });
}

export { updateDeploymentStatusCreateInProgress };
