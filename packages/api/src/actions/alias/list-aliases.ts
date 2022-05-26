import { listAliasesForDeployment } from '@millihq/tfn-dynamodb-actions';
import { Request, Response } from 'lambda-api';

import { paths } from '../../../schema';
import { DynamoDBServiceType } from '../../services/dynamodb';
import { generateAliasId } from './alias-utils';

type ErrorResponse =
  paths['/aliases']['get']['responses']['400']['content']['application/json'];
type SuccessResponse =
  paths['/aliases']['get']['responses']['200']['content']['application/json'];

/**
 * The amount of items that should be fetched with each query
 */
const PAGE_LIMIT = 25;
const START_AT_KEY_SPLIT_CHAR = '#';

async function listAliases(
  req: Request,
  res: Response
): Promise<SuccessResponse | ErrorResponse> {
  const { deploymentId, startAt } = req.query;
  let startKey:
    | {
        hostnameRev: string;
        basePath: string;
        deploymentId: string;
        createDate: string;
      }
    | undefined;

  if (typeof deploymentId !== 'string') {
    res.status(400);
    return {
      code: 'INVALID_PARAMS',
      status: 400,
      message: 'Required parameter deploymentId is invalid or missing.',
    };
  }

  if (typeof startAt === 'string') {
    const [hostnameRev, basePath, deploymentId, createDate] = startAt.split(
      START_AT_KEY_SPLIT_CHAR
    );

    if (hostnameRev && basePath && deploymentId && createDate) {
      startKey = { hostnameRev, basePath, deploymentId, createDate };
    }
  }

  const dynamoDB = req.namespace.dynamoDB as DynamoDBServiceType;

  const { meta, items } = await listAliasesForDeployment({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    aliasTableName: dynamoDB.getAliasTableName(),
    limit: PAGE_LIMIT,
    deploymentId,
    startKey,
  });

  let nextKey: string | null = null;
  if (meta.lastKey) {
    nextKey = [
      meta.lastKey.hostnameRev,
      meta.lastKey.basePath,
      meta.lastKey.deploymentId,
      meta.lastKey.createDate,
    ].join(START_AT_KEY_SPLIT_CHAR);
  }

  return {
    metadata: {
      next: nextKey,
    },
    items: items.map((alias) => {
      return {
        id: generateAliasId(alias),
        deployment: alias.DeploymentId,
      };
    }),
  };
}

export { listAliases };
