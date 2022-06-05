import { Request, Response } from 'lambda-api';

import {
  listAliasesForDeployment,
  getDeploymentById,
  deleteDeploymentById as dynamoDBdeleteDeploymentById,
  deleteAliasById,
  updateDeploymentStatusDestroyRequested,
} from '@millihq/tfn-dynamodb-actions';

import { paths } from '../../../schema';
import { DynamoDBServiceType } from '../../services/dynamodb';
import { CloudFormationServiceType } from '../../services/cloudformation';
import { deploymentDefaultSerializer } from '../../serializers/deployment';

type SuccessResponse =
  paths['/deployments/{deploymentId}']['delete']['responses']['200']['content']['application/json'];
type ErrorResponse =
  paths['/deployments/{deploymentId}']['delete']['responses']['400']['content']['application/json'];

const RESPONSE_DEPLOYMENT_DELETION_FAILED: ErrorResponse = {
  code: 'DEPLOYMENT_DELETION_FAILED',
  status: 400,
  message: 'The deployment with the provided id could not be deleted.',
};

async function deleteDeploymentById(
  req: Request,
  res: Response
): Promise<SuccessResponse | void> {
  const cloudFormationService = req.namespace
    .cloudFormation as CloudFormationServiceType;
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

  // When it only has a deployment alias the length of the returned aliases
  // should be 1.
  // However for the case that the alias was already deleted in the past and the
  // deployment still exists we also allow 0 aliases.
  if (!hasDeploymentAliasOnly || aliases.items.length > 1) {
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
        return res.status(400).json(RESPONSE_DEPLOYMENT_DELETION_FAILED);
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
      // Delete aliases
      const deploymentAlias = aliases.items[0];
      if (deploymentAlias) {
        await deleteAliasById({
          dynamoDBClient: dynamoDB.getDynamoDBClient(),
          aliasTableName: dynamoDB.getAliasTableName(),
          SK: deploymentAlias.SK,
        });
      }

      // Trigger stack deletion
      if (deployment.CFStack) {
        const updatedDeployment = await updateDeploymentStatusDestroyRequested({
          dynamoDBClient: dynamoDB.getDynamoDBClient(),
          deploymentTableName: dynamoDB.getDeploymentTableName(),
          deploymentId: {
            PK: deployment.PK,
            SK: deployment.SK,
          },
        });
        await cloudFormationService.deleteStack(deployment.CFStack);

        // Deployment status is updated by deployment-controller when
        // CloudFormation triggers a `DELETE_IN_PROGRESS` event on the stack
        res.status(200);
        return deploymentDefaultSerializer(updatedDeployment);
      }

      // No CloudFormation Stack present, so we can delete it from the database
      const deleteResponse = await dynamoDBdeleteDeploymentById({
        dynamoDBClient: dynamoDB.getDynamoDBClient(),
        deploymentTableName: dynamoDB.getDeploymentTableName(),
        deploymentId: {
          PK: deployment.PK,
          SK: deployment.SK,
        },
      });

      if (!deleteResponse) {
        return res.status(400).json(RESPONSE_DEPLOYMENT_DELETION_FAILED);
      }

      return res.sendStatus(204);

    case 'DESTROY_REQUESTED':
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
