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
   * The full domain of the alias, in reversed form com.example.my-alias.
   */
  hostnameRev: string;
  /**
   * The basePath under which the alias is served, defaults to `/.`
   */
  basePath?: string;
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
  hostnameRev,
  basePath = '/',
  createDate = new Date(),
  isDeploymentAlias = false,
  deploymentId,
  lambdaRoutes,
  routes,
  prerenders,
}: CreateAliasOptions) {
  const createDateString = createDate.toISOString();

  return dynamoDBClient
    .putItem({
      TableName: aliasTableName,
      Item: {
        // Keys
        PK: {
          S: 'ROUTES',
        },
        SK: {
          S: `${hostnameRev}#${basePath}`,
        },
        GSI1PK: {
          S: `D#${deploymentId}`,
        },
        GSI1SK: {
          S: `${createDateString}#R#${hostnameRev}#${basePath}`,
        },

        // Attributes
        ItemVersion: {
          N: '1',
        },
        CreateDate: {
          S: createDateString,
        },
        DeploymentId: {
          S: deploymentId,
        },
        HostnameRev: {
          S: hostnameRev,
        },
        BasePath: {
          S: basePath,
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
