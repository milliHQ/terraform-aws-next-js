import DynamoDB from 'aws-sdk/clients/dynamodb';

import { DeploymentItemCreateDateIndex } from '../types';

const { unmarshall } = DynamoDB.Converter;

type StartKey = {
  deploymentId: string;
  createDate: string;
};

type ListDeploymentOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the deployments.
   */
  deploymentTableName: string;
  /**
   * Maximum number of items that should be returned.
   */
  limit?: number | undefined;
  /**
   * The id where to start the query from.
   */
  startKey?: StartKey;
};

type ListDeploymentsResult = {
  meta: {
    lastKey: StartKey | null;
    count: number;
  };
  items: DeploymentItemCreateDateIndex[];
};

/**
 * Returns all deployments ordered by creationDate.
 *
 * @param options
 * @returns
 */
async function listDeployments({
  dynamoDBClient,
  deploymentTableName,
  limit,
  startKey,
}: ListDeploymentOptions): Promise<ListDeploymentsResult> {
  const params: DynamoDB.QueryInput = {
    TableName: deploymentTableName,
    IndexName: 'CreateDateIndex',
    ExpressionAttributeValues: {
      ':v1': {
        S: 'DEPLOYMENTS',
      },
    },
    KeyConditionExpression: 'PK = :v1',
    Limit: limit,
    // Return the items in DESC order (newer -> older)
    ScanIndexForward: false,
  };

  if (startKey) {
    params.ExclusiveStartKey = {
      PK: {
        S: 'DEPLOYMENTS',
      },
      SK: {
        S: `D#${startKey.deploymentId}`,
      },
      GSI1SK: {
        S: `${startKey.createDate}#D#${startKey.deploymentId}`,
      },
    };
  }

  const { Count, Items, LastEvaluatedKey } = await dynamoDBClient
    .query(params)
    .promise();

  let lastKey: StartKey | null = null;
  if (LastEvaluatedKey) {
    const [createDate, , deploymentId] = LastEvaluatedKey.GSI1SK.S!.split('#');
    lastKey = {
      deploymentId: deploymentId,
      createDate,
    };
  }

  return {
    meta: {
      count: Count !== undefined ? Count : 0,
      lastKey,
    },
    items: Items
      ? Items.map(unmarshall as () => DeploymentItemCreateDateIndex)
      : [],
  };
}

export { listDeployments };
