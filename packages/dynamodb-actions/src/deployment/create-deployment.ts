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
  createdDate?: Date;
};

/**
 * Creates and initializes a new deployment.
 */
function createDeployment({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  createdDate = new Date(),
}: CreateDeploymentOptions) {
  const createDateString = createdDate.toISOString();

  return dynamoDBClient
    .putItem({
      TableName: deploymentTableName,
      Item: {
        PK: {
          // DeploymentId
          S: `${deploymentId}`,
        },
        SK: {
          // Sort key is createDate
          S: createDateString,
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
