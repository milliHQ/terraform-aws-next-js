import { Request, Response } from 'lambda-api';

import { listAliasesForDeployment, deleteAliasById } from '@millihq/tfn-dynamodb-actions';

import { paths } from '../../../schema';
import { DynamoDBServiceType } from '../../services/dynamodb';

type ErrorResponse =
  paths['/deployments/{deploymentId}']['delete']['responses']['400']['content']['application/json'];

async function deleteDeploymentById(
  req: Request,
  res: Response
): Promise<void> {
  const dynamoDB = req.namespace.dynamoDB as DynamoDBServiceType;
  const deploymentId = req.params.deploymentId;

  if (typeof deploymentId !== 'string') {
    const paramsErrorResponse: ErrorResponse = {
      code: 'INVALID_PARAMS',
      status: 400,
      message: 'The deploymentId provided is invalid.',
    };
    return res.status(400).json(paramsErrorResponse);
  }

  // Check if the deployment has aliases
  const aliases = await listAliasesForDeployment({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    aliasTableName: dynamoDB.getAliasTableName(),
    deploymentId,
  });

  // Check if an alias is present that is not the deploymentAlias
  const hasDeploymentAliasOnly =
    aliases.meta.count === 1 &&
    !aliases.items.some((alias) => {
      return alias.DeploymentAlias === false;
    });

  if (!hasDeploymentAliasOnly) {
    const errorResponse: ErrorResponse = {
      code: 'ALIASES_ASSOCIATED',
      status: 400,
      message:
        'The deployment cannot be removed because it has custom aliases associated with it. Remove the aliases first before deleting the deployment.',
    };
    return res.status(400).json(errorResponse);
  }

  // Remove the deployment alias

}

export { deleteDeploymentById };
