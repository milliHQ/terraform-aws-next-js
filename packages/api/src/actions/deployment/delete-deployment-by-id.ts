import { Request, Response } from 'lambda-api';

import {
  listAliasesForDeployment,
  getDeploymentById,
  deleteDeploymentById as dynamoDBdeleteDeploymentById,
} from '@millihq/tfn-dynamodb-actions';

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
  const hasDeploymentAliasOnly = !aliases.items.some((alias) => {
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

  // Check the status of the deployment
  const deployment = await getDeploymentById({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    deploymentTableName: dynamoDB.getDeploymentTableName(),
    deploymentId,
  });

  if (!deployment) {
    const errorResponse: ErrorResponse = {
      code: 'NOT_FOUND',
      status: 404,
      message: 'The deployment with the provided id does not exist.',
    };
    return res.status(404).json(errorResponse);
  }

  switch (deployment.Status) {
    /**
     * If the deployment is in one of the following status, it can be deleted from
     * the database without handling CloudFormation stack deletion.
     */
    case 'INITIALIZED': {
      const deleteResponse = await dynamoDBdeleteDeploymentById({
        dynamoDBClient: dynamoDB.getDynamoDBClient(),
        deploymentTableName: dynamoDB.getDeploymentTableName(),
        deploymentId: {
          PK: deployment.PK,
          SK: deployment.SK,
        },
      });

      if (!deleteResponse) {
        const errorResponse: ErrorResponse = {
          code: 'DEPLOYMENT_DELETION_FAILED',
          status: 400,
          message: 'The deployment with the provided id could not be deleted.',
        };
        return res.status(400).json(errorResponse);
      }

      return res.sendStatus(204);
    }

    /**
     * If the deployment has one of the following status, a CloudFormation stack
     * deletion should be triggered, the deployment is then removed from the
     * database by the deployment controller.
     */
    case 'CREATE_FAILED':
    case 'FINISHED':

    case 'DESTROY_IN_PROGRESS': {
      const errorResponse: ErrorResponse = {
        code: 'DEPLOYMENT_DESTROY_IN_PROGRESS',
        status: 400,
        message: 'The deployment is currently being deleted.',
      };
      return res.status(400).json(errorResponse);
    }

    default: {
      const errorResponse: ErrorResponse = {
        code: 'DEPLOYMENT_DRIFT',
        status: 400,
        message:
          'The deployment is currently in a drift status. Please contact your administrator to resolve this.',
      };
      res.status(400).json(errorResponse);
    }
  }
}

export { deleteDeploymentById };
