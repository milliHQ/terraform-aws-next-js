import DynamoDB from 'aws-sdk/clients/dynamodb';

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
  createDate?: Date;
};

/**
 * Creates and initializes a new deployment.
 */
function createDeployment({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  createDate = new Date(),
}: CreateDeploymentOptions) {
  const createDateString = createDate.toISOString();

  return dynamoDBClient
    .putItem({
      TableName: deploymentTableName,
      Item: {
        // Keys
        PK: {
          S: 'DEPLOYMENTS',
        },
        SK: {
          S: `D#${deploymentId}`,
        },
        GSI1SK: {
          S: `${createDateString}#D#${deploymentId}`,
        },

        // Attributes
        DeploymentId: {
          S: deploymentId,
        },
        CreateDate: {
          S: createDateString,
        },
        ItemVersion: {
          N: '1',
        },
        Status: {
          S: 'INITIALIZED',
        },
      },
    })
    .promise();
}

export { createDeployment };
