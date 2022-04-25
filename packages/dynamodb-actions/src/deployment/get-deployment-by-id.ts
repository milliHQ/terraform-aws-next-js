import { DynamoDB } from 'aws-sdk';

import { DeploymentItem } from '../types';

const { unmarshall } = DynamoDB.Converter;

type GetDeploymentByIdOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the deployments.
   */
  deploymentTableName: string;
  /**
   * The id of the deployment that should be requested.
   */
  deploymentId: string;
  /**
   * Only return the attributes defined
   */
  attributes?: Record<string, boolean>;
};

async function getDeploymentById({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  attributes = {},
}: GetDeploymentByIdOptions): Promise<DeploymentItem | null> {
  const queryParams: DynamoDB.QueryInput = {
    TableName: deploymentTableName,
    ExpressionAttributeValues: {
      ':v1': {
        S: deploymentId,
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

  return unmarshall(Items![0]) as DeploymentItem;
}

export { getDeploymentById };
