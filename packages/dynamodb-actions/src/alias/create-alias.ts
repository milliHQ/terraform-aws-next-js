import DynamoDB from 'aws-sdk/clients/dynamodb';

import { RouteItem } from '../types';

const { marshall } = DynamoDB.Converter;

type CreatedRouteItem = Pick<
  RouteItem,
  | 'PK'
  | 'SK'
  | 'GSI1PK'
  | 'GSI1SK'
  | 'BasePath'
  | 'CreateDate'
  | 'DeploymentAlias'
  | 'DeploymentId'
  | 'HostnameRev'
  | 'ItemVersion'
  | 'LambdaRoutes'
  | 'Prerenders'
  | 'Routes'
>;

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
   * The full domain of the alias, in reversed form: com.example.my-alias
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
async function createAlias({
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
}: CreateAliasOptions): Promise<CreatedRouteItem> {
  const createDateString = createDate.toISOString();
  const routeItemToCreate: CreatedRouteItem = {
    // Keys
    PK: 'ROUTES',
    SK: `${hostnameRev}#${basePath}`,
    GSI1PK: `D#${deploymentId}`,
    GSI1SK: `${createDateString}#R#${hostnameRev}#${basePath}`,

    // Attributes
    ItemVersion: 1,
    CreateDate: createDateString,
    DeploymentId: deploymentId,
    HostnameRev: hostnameRev,
    BasePath: basePath,
    DeploymentAlias: isDeploymentAlias,
    Routes: routes,
    LambdaRoutes: lambdaRoutes,
    Prerenders: prerenders,
  };

  const response = await dynamoDBClient
    .putItem({
      TableName: aliasTableName,
      Item: marshall(routeItemToCreate),
    })
    .promise();

  if (response.$response.error) {
    throw response.$response.error;
  }

  return routeItemToCreate;
}

export { createAlias };
