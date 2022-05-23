import {
  getAliasById,
  getDeploymentById,
  createAlias,
  reverseHostname,
} from '@millihq/tfn-dynamodb-actions';
import { IsOptional, Length, validate } from 'class-validator';
import { Request, Response } from 'lambda-api';

import { DynamoDBServiceType } from '../../services/dynamodb';

class CreateOrUpdateAliasPayload {
  @Length(1)
  customDomain: string;

  /**
   * deploymentId or alias (other customDomain)
   */
  @Length(1)
  target: string;

  /**
   * When set the alias gets overridden, when it already exists.
   * An exception from it are the deployment aliases, which cannot be deleted or
   * overridden.
   */
  @IsOptional()
  override?: boolean;
}

async function createOrUpdateAlias(req: Request, res: Response) {
  const payload = new CreateOrUpdateAliasPayload();
  payload.customDomain = req.body.customDomain;
  payload.target = req.body.target;
  payload.override = req.body.override;

  const payloadErrors = await validate(payload);
  if (payloadErrors.length > 0) {
    return res.error(400, 'Payload validation', payloadErrors);
  }

  const dynamoDB = req.namespace.dynamoDB as DynamoDBServiceType;
  const hostnameToCreate = payload.customDomain;

  // Check if the target is an alias or an deployment-id
  const targetIsDeploymentId = payload.target.indexOf('.') === -1;
  let targetDeploymentId: string;

  if (!targetIsDeploymentId) {
    const hostnameRev = reverseHostname(payload.target);
    // Target is another alias, get the deployment ID from the alias first
    const targetAlias = await getAliasById({
      dynamoDBClient: dynamoDB.getDynamoDBClient(),
      aliasTableName: dynamoDB.getAliasTableName(),
      hostnameRev,
      attributes: {
        DeploymentId: true,
      },
    });

    if (!targetAlias) {
      return res.error(400, `Alias target ${payload.target} does not exist.`);
    }

    targetDeploymentId = targetAlias.DeploymentId;
  } else {
    targetDeploymentId = payload.target;
  }

  // Get the target deployment
  const targetDeployment = await getDeploymentById({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    deploymentTableName: dynamoDB.getDeploymentTableName(),
    deploymentId: targetDeploymentId,
  });

  if (!targetDeployment) {
    return res.error(
      400,
      `Deployment with id ${targetDeploymentId} does not exist.`
    );
  }

  // Check if the alias already exists
  const customDomainRev = reverseHostname(payload.customDomain);
  const maybeExistingAlias = await getAliasById({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    aliasTableName: dynamoDB.getAliasTableName(),
    hostnameRev: customDomainRev,
    attributes: {
      DeploymentId: true,
      DeploymentAlias: true,
    },
  });

  // When alias already exists and it is a deployment alias, abort
  if (maybeExistingAlias && maybeExistingAlias.DeploymentAlias === true) {
    return res.error(
      400,
      `Cannot override existing alias ${hostnameToCreate} because it is a deployment alias that cannot be changed.`
    );
  }

  // Create the new alias
  const hostnameToCreateRev = reverseHostname(hostnameToCreate);
  await createAlias({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    aliasTableName: dynamoDB.getAliasTableName(),
    hostnameRev: hostnameToCreateRev,
    createDate: new Date(),
    deploymentId: targetDeploymentId,
    lambdaRoutes: targetDeployment.LambdaRoutes,
    prerenders: targetDeployment.Prerenders,
    routes: targetDeployment.Routes,
  });

  return {
    status: 200,
  };
}

export { createOrUpdateAlias };
