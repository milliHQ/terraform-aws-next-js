import {
  deleteAliasById as dynamoDeleteAliasById,
  getAliasById,
  reverseHostname,
} from '@millihq/tfn-dynamodb-actions';
import { validate, IsUrl, IsOptional } from 'class-validator';
import { Request, Response } from 'lambda-api';

import { paths } from '../../../schema';
import { DynamoDBServiceType } from '../../services/dynamodb';
import { hostnameValidationOptions } from './alias-utils';

type ErrorResponse =
  paths['/aliases/{hostname}/{basePath}']['delete']['responses']['400']['content']['application/json'];
type NotFoundResponse =
  paths['/aliases/{hostname}/{basePath}']['delete']['responses']['404']['content']['application/json'];

class DeleteAliasRequestParams {
  /**
   * The hostname of the alias that should be removed.
   */
  @IsUrl(hostnameValidationOptions)
  hostname: string;

  /**
   * The basePath of the alias that should be removed.
   */
  @IsOptional()
  basePath: string = '/';
}

async function deleteAliasById(req: Request, res: Response) {
  const { params: requestParams = {} } = req;
  const validatedRequestParams = new DeleteAliasRequestParams();
  if (requestParams.hostname) {
    validatedRequestParams.hostname = requestParams.hostname;
  }
  if (requestParams.basePath) {
    validatedRequestParams.basePath = `/${requestParams.basePath}`;
  }

  const requestBodyErrors = await validate(validatedRequestParams);
  if (requestBodyErrors.length > 0) {
    const errorResponse: ErrorResponse = {
      code: 'INVALID_PARAMS',
      status: 400,
      message: requestBodyErrors.toString(),
    };
    return res.status(400).json(errorResponse);
  }

  const dynamoDB = req.namespace.dynamoDB as DynamoDBServiceType;
  const aliasToDeleteHostnameRev = reverseHostname(
    validatedRequestParams.hostname
  );

  // Check if the alias is protected (deployment alias)
  const dbAlias = await getAliasById({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    aliasTableName: dynamoDB.getAliasTableName(),
    hostnameRev: aliasToDeleteHostnameRev,
    basePath: validatedRequestParams.basePath,
  });

  if (!dbAlias) {
    const errorResponse: NotFoundResponse = {
      code: 'ALIAS_NOT_FOUND',
      status: 404,
      message: 'The requested alias does not exist.',
    };
    return res.status(404).json(errorResponse);
  }

  if (dbAlias.DeploymentAlias === true) {
    const errorResponse: ErrorResponse = {
      code: 'DEPLOYMENT_ALIAS',
      status: 400,
      message:
        'Requested alias cannot be deleted since it is a deployment alias. Can only be deleted when the deployment gets deleted.',
    };
    return res.status(400).json(errorResponse);
  }

  await dynamoDeleteAliasById({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    aliasTableName: dynamoDB.getAliasTableName(),
    SK: dbAlias.SK,
  });

  res.sendStatus(204);
}

export { deleteAliasById };
