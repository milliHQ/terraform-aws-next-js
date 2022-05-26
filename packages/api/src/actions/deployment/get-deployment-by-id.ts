import { getDeploymentById as dynamoDBgetDeploymentById } from '@millihq/tfn-dynamodb-actions';
import { Request, Response } from 'lambda-api';

import { paths } from '../../../schema';
import { DynamoDBServiceType } from '../../services/dynamodb';

type SuccessResponse =
  paths['/deployments/{deploymentId}']['get']['responses']['200']['content']['application/json'];
type NotFoundResponse =
  paths['/deployments/{deploymentId}']['get']['responses']['404']['content']['application/json'];

async function getDeploymentById(
  req: Request,
  res: Response
): Promise<SuccessResponse | NotFoundResponse> {
  const dynamoDB = req.namespace.dynamoDB as DynamoDBServiceType;
  const deploymentId = req.params.deploymentId;

  if (!deploymentId) {
    throw new Error('Could not get deploymentId from path');
  }

  const result = await dynamoDBgetDeploymentById({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    deploymentTableName: dynamoDB.getDeploymentTableName(),
    deploymentId,
  });

  if (!result) {
    res.status(404);
    return {
      status: 404,
      code: 'DEPLOYMENT_NOT_FOUND',
      message: `Deployment with id "${deploymentId}" does not exist.`,
    };
  }

  return {
    // Required attributes
    id: result.DeploymentId,
    createDate: result.CreateDate,
    status: result.Status,
    // Optional attributes
    deploymentAlias: result.DeploymentAlias,
  };
}

export { getDeploymentById };
