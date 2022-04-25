import { DynamoDB } from 'aws-sdk';

type CreateDeploymentOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the deployments.
   */
  deploymentTableName: string;
  /**
   * Id of the deployment (must be unique).
   */
  deploymentId: string;
  /**
   * Date when the deployment was created.
   */
  createdDate?: Date;
  /**
   * Stringified JSON object that contains the route config.
   */
  routes: string;
  /**
   * Stringified JSON object that contains routes that are served by static
   * generated HTML files.
   */
  staticRoutes: string;
  /**
   * Stringified JSON object that contains routes that are served from
   * prerendered generated HTML files.
   */
  prerenders: string;
};

function createDeployment({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  createdDate = new Date(),
  routes,
  staticRoutes,
  prerenders,
}: CreateDeploymentOptions) {
  const createdDateString = createdDate.toISOString();

  return dynamoDBClient
    .putItem({
      TableName: deploymentTableName,
      Item: {
        // DeploymentId
        PK: { S: deploymentId },
        // CreatedAt
        SK: {
          S: createdDateString,
        },
        ItemVersion: {
          N: '1',
        },
        Status: {
          S: 'CREATE_IN_PROGRESS',
        },
        Routes: {
          S: routes,
        },
        StaticRoutes: {
          S: staticRoutes,
        },
        Prerenders: {
          S: prerenders,
        },
      },
    })
    .promise();
}

export { createDeployment };
