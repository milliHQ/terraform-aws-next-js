import { listDeployments as dynamoDBlistDeployments } from '@millihq/tfn-dynamodb-actions';
import { Request, Response } from 'lambda-api';

import { paths } from '../../../schema';
import { deploymentDefaultSerializer } from '../../serializers/deployment';
import { DynamoDBServiceType } from '../../services/dynamodb';

/**
 * The amount of items that should be fetched with each query
 */
const PAGE_LIMIT = 25;
const START_AT_KEY_SPLIT_CHAR = '#';

type SuccessResponse =
  paths['/deployments']['get']['responses']['200']['content']['application/json'];

async function listDeployments(
  req: Request,
  _res: Response
): Promise<SuccessResponse> {
  /**
   * StartAt is a combined index key of the form: deploymentId#CreateDate that
   * needs to be splitted at the character `#`.
   */
  const { startAt } = req.query;
  let startAtDeploymentId: string | undefined;
  let startAtCreateDate: string | undefined;

  if (typeof startAt === 'string') {
    const splittedStartKey = startAt.split(START_AT_KEY_SPLIT_CHAR);
    startAtDeploymentId = splittedStartKey[0];
    startAtCreateDate = splittedStartKey[1];
  }

  const dynamoDB = req.namespace.dynamoDB as DynamoDBServiceType;

  const { meta, items } = await dynamoDBlistDeployments({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    deploymentTableName: dynamoDB.getDeploymentTableName(),
    limit: PAGE_LIMIT,
    startKey:
      startAtDeploymentId && startAtCreateDate
        ? {
            deploymentId: startAtDeploymentId,
            createDate: startAtCreateDate,
          }
        : undefined,
  });

  let nextKey: string | null = null;
  if (meta.lastKey) {
    nextKey =
      meta.lastKey.deploymentId +
      START_AT_KEY_SPLIT_CHAR +
      meta.lastKey.createDate;
  }

  return {
    metadata: {
      next: nextKey,
    },
    items: items.map(deploymentDefaultSerializer),
  };
}

export { listDeployments };
