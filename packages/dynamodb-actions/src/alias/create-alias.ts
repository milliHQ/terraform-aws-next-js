import { DynamoDB } from 'aws-sdk';

type CreateAliasOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the aliases.
   */
  aliasTableName: string;
  /**
   * The full domain of the alias, e.g. my-alias.example.com.
   */
  alias: string;
  /**
   * Date when the alias was created.
   */
  createdDate: Date;
  /**
   * If the alias is the default alias of an deployment.
   */
  isDeploymentAlias?: boolean;
  /**
   * ID of the deployment where the alias points to.
   */
  deploymentId: string;
};

/**
 * Creates a new alias for an deployment.
 */
function createAlias({
  dynamoDBClient,
  aliasTableName,
  alias,
  createdDate,
  isDeploymentAlias = false,
  deploymentId,
}: CreateAliasOptions) {
  const sortKey = `${deploymentId}#${createdDate.toISOString()}`;

  return dynamoDBClient
    .putItem({
      TableName: aliasTableName,
      Item: {
        PK: { S: alias },
        SK: {
          S: sortKey,
        },
        ItemVersion: {
          N: '1',
        },
        CreatedDate: {
          S: createdDate.toISOString(),
        },
        DeploymentAlias: {
          BOOL: isDeploymentAlias,
        },
      },
    })
    .promise();
}

export { createAlias };
