import DynamoDB from 'aws-sdk/clients/dynamodb';

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
  createDate?: Date;
  /**
   * If the alias is the default alias of an deployment.
   */
  isDeploymentAlias?: boolean;
  /**
   * ID of the deployment where the alias points to.
   */
  deploymentId: string;

  /**
   * Stringified JSON Routing table which paths should be served by Lambdas.
   */
  lambdaRoutes: string;
  /**
   * Stringified JSON object that contains the route config.
   * This value gets copied over from the associated deployment.
   */
  routes: string;
  /**
   * Stringified JSON object that contains routes that are served from
   * prerendered generated HTML files.
   * This value gets copied over from the associated deployment.
   */
  prerenders: string;
};

/**
 * Creates a new alias for an deployment.
 */
function createAlias({
  dynamoDBClient,
  aliasTableName,
  alias,
  createDate = new Date(),
  isDeploymentAlias = false,
  deploymentId,
  lambdaRoutes,
  routes,
  prerenders,
}: CreateAliasOptions) {
  const createDateString = createDate.toISOString();

  // - Group by deploymentId
  // - Sort by Date
  const sortKey = `${deploymentId}#${createDateString}`;
  // - Group by Date
  const deploymentIdIndexSortKey = `${createDateString}#${alias}`;

  return dynamoDBClient
    .putItem({
      TableName: aliasTableName,
      Item: {
        /**
         * Keys
         */
        PK: { S: alias },
        SK: {
          S: sortKey,
        },
        DeploymentId: {
          S: deploymentId,
        },
        CreateDateByAlias: {
          S: deploymentIdIndexSortKey,
        },

        /**
         * Attributes
         */
        ItemVersion: {
          N: '1',
        },
        CreateDate: {
          S: createDateString,
        },
        DeploymentAlias: {
          BOOL: isDeploymentAlias,
        },
        Routes: {
          S: routes,
        },
        LambdaRoutes: {
          S: lambdaRoutes,
        },
        Prerenders: {
          S: prerenders,
        },
      },
    })
    .promise();
}

export { createAlias };
