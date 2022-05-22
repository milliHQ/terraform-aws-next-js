import DynamoDB from 'aws-sdk/clients/dynamodb';

import { AliasItem } from '../types';

const { unmarshall } = DynamoDB.Converter;

type StartKey = {
  alias: string;
  deploymentId: string;
  createDate: string;
};

type ListAliasesForDeploymentOptions = {
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
  /**
   * Maximum number of items that should be returned.
   */
  limit?: number | undefined;
  /**
   * The id where to start the query from.
   */
  startKey?: StartKey;
};

type ListAliasesResult = {
  meta: {
    lastKey: StartKey | null;
    count: number;
  };
  items: AliasItem[];
};

/**
 * Returns all aliases that are associated with a deploymentId in DESC order.
 */
async function listAliasesForDeployment({
  aliasTableName,
  dynamoDBClient,
  deploymentId,
  limit,
  startKey,
}: ListAliasesForDeploymentOptions): Promise<ListAliasesResult> {
  const params: DynamoDB.QueryInput = {
    TableName: aliasTableName,
    IndexName: 'DeploymentIdIndex',
    ExpressionAttributeValues: {
      ':v1': {
        S: deploymentId,
      },
    },
    KeyConditionExpression: 'DeploymentId = :v1',
    Limit: limit,
    // Return the items in DESC order (newer -> older)
    ScanIndexForward: false,
  };

  if (startKey) {
    params.ExclusiveStartKey = {
      PK: {
        S: startKey.alias,
      },
      SK: {
        S: `${deploymentId}#${startKey.createDate}`,
      },
      DeploymentId: {
        S: startKey.deploymentId,
      },
      CreateDateByAlias: {
        S: `${startKey.createDate}#${startKey.alias}`,
      },
    };
  }

  const { Count, Items, LastEvaluatedKey } = await dynamoDBClient
    .query(params)
    .promise();

  let lastKey: StartKey | null = null;
  if (LastEvaluatedKey) {
    const [createDate] = LastEvaluatedKey.CreateDateByAlias.S!.split('#');
    lastKey = {
      alias: LastEvaluatedKey.PK.S!,
      deploymentId: LastEvaluatedKey.DeploymentId.S!,
      createDate,
    };
  }

  return {
    meta: {
      count: Count !== undefined ? Count : 0,
      lastKey,
    },
    items: Items ? Items.map(unmarshall as () => AliasItem) : [],
  };
}

export { listAliasesForDeployment };
