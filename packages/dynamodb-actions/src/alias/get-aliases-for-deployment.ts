import DynamoDB from 'aws-sdk/clients/dynamodb';

type GetAliasesForDeploymentOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the aliases.
   */
  aliasTableName: string;
  /**
   * The id of the deployment.
   */
  deploymentId: string;
};

/**
 * Returns all aliases that are associated with a deploymentId
 */
async function getAliasesForDeployment({}: GetAliasesForDeploymentOptions) {}

export { getAliasesForDeployment };
