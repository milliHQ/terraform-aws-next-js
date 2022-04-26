import { DynamoDB } from 'aws-sdk';

import { AliasItem } from '../types';

const { unmarshall } = DynamoDB.Converter;

type GetDeploymentByIdOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the aliases.
   */
  aliasTableName: string;
  /**
   * The id of the alias that should be requested.
   */
  aliasId: string;
  /**
   * Only return the attributes defined
   */
  attributes?: Record<string, boolean>;
};

async function getAliasById({
  dynamoDBClient,
  aliasTableName,
  aliasId,
  attributes = {},
}: GetDeploymentByIdOptions): Promise<AliasItem | null> {
  const queryParams: DynamoDB.QueryInput = {
    TableName: aliasTableName,
    ExpressionAttributeValues: {
      ':v1': {
        S: aliasId,
      },
    },
    KeyConditionExpression: 'PK = :v1',
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

  return unmarshall(Items![0]) as AliasItem;
}

export { getAliasById };
