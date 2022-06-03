import { URL } from 'url';

import {
  getAliasById,
  getDeploymentById,
  createAlias,
  reverseHostname,
} from '@millihq/tfn-dynamodb-actions';
import { IsOptional, Length, validate, IsUrl, isURL } from 'class-validator';
import { Request, Response } from 'lambda-api';

import { paths } from '../../../schema';
import { DynamoDBServiceType } from '../../services/dynamodb';
import { generateAliasId, hostnameValidationOptions } from './alias-utils';

type SuccessResponse =
  paths['/aliases']['post']['responses']['201']['content']['application/json'];
type ErrorResponse =
  paths['/aliases']['post']['responses']['400']['content']['application/json'];

class CreateOrUpdateAliasPayload {
  /**
   * The alias name that should be created.
   * Consists of hostname and basePath, e.g. example.com/
   */
  @IsUrl(hostnameValidationOptions)
  alias: string;

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

async function createOrUpdateAlias(
  req: Request,
  res: Response
): Promise<SuccessResponse | void> {
  const dynamoDB = req.namespace.dynamoDB as DynamoDBServiceType;
  const { body: requestBody = {} } = req;

  // Validate requestBody
  const payload = new CreateOrUpdateAliasPayload();
  payload.alias = requestBody.alias;
  payload.target = requestBody.target;
  payload.override = requestBody.override;

  const payloadErrors = await validate(payload);
  if (payloadErrors.length > 0) {
    const errorResponse: ErrorResponse = {
      code: 'INVALID_PARAMS',
      status: 400,
      message: payloadErrors.toString(),
    };
    return res.status(400).json(errorResponse);
  }

  // URL always requires a protocol
  const aliasToCreateUrl = new URL(`http://${payload.alias}`);
  const aliasToCreateHostname = aliasToCreateUrl.hostname;
  const aliasToCreateHostnameRev = reverseHostname(aliasToCreateHostname);
  const aliasToCreateBasePath = aliasToCreateUrl.pathname;

  // Check if the target is an alias or an deployment-id
  let targetDeploymentId: string;
  const targetIsDeploymentId = payload.target.indexOf('.') === -1;

  if (!targetIsDeploymentId) {
    // Check if the target is an URL
    if (!isURL(payload.target, hostnameValidationOptions)) {
      const errorResponse: ErrorResponse = {
        code: 'INVALID_PARAMS',
        status: 400,
        message: 'Parameter target is not a valid alias.',
      };
      return res.status(400).json(errorResponse);
    }

    // URL always requires a protocol
    const aliasTargetUrl = new URL(`http://${payload.target}`);
    const aliasTargetHostnameRev = reverseHostname(aliasTargetUrl.hostname);

    // Target is another alias, get the deployment ID from the alias first
    const targetAlias = await getAliasById({
      dynamoDBClient: dynamoDB.getDynamoDBClient(),
      aliasTableName: dynamoDB.getAliasTableName(),
      hostnameRev: aliasTargetHostnameRev,
      basePath: aliasTargetUrl.pathname,
    });

    if (!targetAlias) {
      const errorResponse: ErrorResponse = {
        code: 'INVALID_ALIAS',
        status: 400,
        message: `Alias target ${payload.target} does not exist.`,
      };
      return res.status(400).json(errorResponse);
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
    const errorResponse: ErrorResponse = {
      code: 'INVALID_DEPLOYMENT_ID',
      status: 400,
      message: `Deployment with id ${targetDeploymentId} does not exist.`,
    };
    return res.status(400).json(errorResponse);
  }

  // Check if the alias already exists
  const maybeExistingAlias = await getAliasById({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    aliasTableName: dynamoDB.getAliasTableName(),
    hostnameRev: aliasToCreateHostnameRev,
    basePath: aliasToCreateBasePath,
  });

  if (maybeExistingAlias) {
    if (maybeExistingAlias.DeploymentAlias === true) {
      const errorResponse: ErrorResponse = {
        code: 'DEPLOYMENT_ALIAS',
        status: 400,
        message: `Cannot override existing alias ${payload.alias} because it is a deployment alias that cannot be changed.`,
      };
      return res.status(400).json(errorResponse);
    }

    // If override option is not set explicit, fail
    if (!payload.override) {
      const errorResponse: ErrorResponse = {
        code: 'ALIAS_OVERRIDE_NOT_ALLOWED',
        status: 400,
        message: `Cannot override existing alias ${payload.alias} because override flag is not set.`,
      };
      return res.status(400).json(errorResponse);
    }
  }

  // Create the new alias
  const createdAlias = await createAlias({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    aliasTableName: dynamoDB.getAliasTableName(),
    hostnameRev: aliasToCreateHostnameRev,
    deploymentId: targetDeploymentId,
    lambdaRoutes: targetDeployment.LambdaRoutes,
    prerenders: targetDeployment.Prerenders,
    routes: targetDeployment.Routes,
  });

  res.status(201);
  return {
    id: generateAliasId(createdAlias),
    deployment: createdAlias.DeploymentId,
    createDate: createdAlias.CreateDate,
  };
}

export { createOrUpdateAlias };
