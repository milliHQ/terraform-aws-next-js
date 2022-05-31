import { DynamoDB } from 'aws-sdk';

import { RouteItem } from '../types';

const { unmarshall } = DynamoDB.Converter;

type GetAliasByIdOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the aliases.
   */
  aliasTableName: string;
  /**
   * Hostname of the route config that is requested.
   */
  hostnameRev: string;
  /**
   * Basepath of the route config that is requested.
   */
  basePath?: string;
  /**
   * Only return the attributes defined
   */
  attributes?: Partial<Record<keyof RouteItem, boolean>>;
};

async function getAliasById({
  dynamoDBClient,
  aliasTableName,
  hostnameRev,
  basePath = '/',
  attributes = {},
}: GetAliasByIdOptions): Promise<RouteItem | null> {
  const queryParams: DynamoDB.QueryInput = {
    TableName: aliasTableName,
    ExpressionAttributeValues: {
      ':v1': {
        S: 'ROUTES',
      },
      ':v2': {
        S: `${hostnameRev}#${basePath}`,
      },
    },
    KeyConditionExpression: 'PK = :v1 and SK = :v2',
    Limit: 1,
  };

  const projectionAttributes = Object.keys(attributes);
  if (projectionAttributes.length > 0) {
    queryParams.ProjectionExpression = projectionAttributes.join(', ');
  }

  const { Count, Items } = await dynamoDBClient.query(queryParams).promise();

  if (Count !== 1) {
    return null;
  }

  return unmarshall(Items![0]) as RouteItem;
}

export { getAliasById };
