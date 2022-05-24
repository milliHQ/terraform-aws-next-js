import DynamoDB from 'aws-sdk/clients/dynamodb';

import { RouteItemDeploymentIdIndex } from '../types';

const { unmarshall } = DynamoDB.Converter;

type StartKey = {
  hostnameRev: string;
  deploymentId: string;
  createDate: string;
  basePath: string;
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
  items: RouteItemDeploymentIdIndex[];
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
        S: `D#${deploymentId}`,
      },
    },
    KeyConditionExpression: 'GSI1PK = :v1',
    Limit: limit,
    // Return the items in DESC order (newer -> older)
    ScanIndexForward: false,
  };

  if (startKey) {
    params.ExclusiveStartKey = {
      PK: {
        S: 'ROUTES',
      },
      SK: {
        S: `${startKey.hostnameRev}#${startKey.basePath}`,
      },
      GSI1PK: {
        S: `D#${startKey.deploymentId}`,
      },
      GSI1SK: {
        S: `${startKey.createDate}#R#${startKey.hostnameRev}#${startKey.basePath}`,
      },
    };
  }

  const { Count, Items, LastEvaluatedKey } = await dynamoDBClient
    .query(params)
    .promise();

  let lastKey: StartKey | null = null;
  if (LastEvaluatedKey) {
    const [, deploymentId] = LastEvaluatedKey.GSI1PK.S!.split('#');
    const [createDate, , hostnameRev, basePath] =
      LastEvaluatedKey.GSI1SK.S!.split('#');
    lastKey = {
      hostnameRev,
      basePath,
      deploymentId,
      createDate,
    };
  }

  return {
    meta: {
      count: Count !== undefined ? Count : 0,
      lastKey,
    },
    items: Items
      ? Items.map(unmarshall as () => RouteItemDeploymentIdIndex)
      : [],
  };
}

export { listAliasesForDeployment };
