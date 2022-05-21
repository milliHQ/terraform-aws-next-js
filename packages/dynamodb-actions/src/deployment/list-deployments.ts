import DynamoDB from 'aws-sdk/clients/dynamodb';

import { DeploymentItem } from '../types';

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
  items: DeploymentItem[];
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
  const params: DynamoDB.ScanInput = {
    TableName: deploymentTableName,
    IndexName: 'CreateDateIndex',
    Limit: limit,
  };

  if (startKey) {
    params.ExclusiveStartKey = {
      PK: {
        S: startKey.deploymentId,
      },
      SK: {
        S: startKey.createDate,
      },
      CreateDate: {
        S: startKey.createDate,
      },
    };
  }

  const { Count, Items, LastEvaluatedKey } = await dynamoDBClient
    .scan(params)
    .promise();

  let lastKey: StartKey | null = null;
  if (LastEvaluatedKey) {
    lastKey = {
      deploymentId: LastEvaluatedKey.PK.S!,
      createDate: LastEvaluatedKey.SK.S!,
    };
  }

  return {
    meta: {
      count: Count !== undefined ? Count : 0,
      lastKey,
    },
    items: Items ? Items.map(unmarshall as () => DeploymentItem) : [],
  };
}

export { listDeployments };
