import { getAliasById, reverseHostname } from '@millihq/tfn-dynamodb-actions';
import { CloudFrontResultResponse } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

import { NotFoundError } from '../errors/not-found-error';

type GetAliasOptions = {
  dynamoDBClient: DynamoDB;
  dynamoDBTable: string;
  uri?: string;
};

/**
 * Gets the proxy config for an alias and returns it back to the viewer.
 *
 * @param options
 * @returns
 */
async function getAlias({
  dynamoDBClient,
  dynamoDBTable,
  uri: alias,
}: GetAliasOptions): Promise<CloudFrontResultResponse> {
  if (!alias) {
    throw new NotFoundError('Empty alias is not allowed');
  }

  const hostnameRev = reverseHostname(alias);
  const aliasRecord = await getAliasById({
    hostnameRev,
    aliasTableName: dynamoDBTable,
    dynamoDBClient,
    attributes: {
      Routes: true,
      Prerenders: true,
      LambdaRoutes: true,
      DeploymentId: true,
    },
  });

  if (!aliasRecord) {
    throw new NotFoundError(`No Alias found for ${alias}`);
  }

  // For performance reasons we build the JSON response here manually, since
  // the records in the database are already stringified JSON objects.
  return {
    status: '200',
    body:
      '{"routes":' +
      aliasRecord.Routes +
      ',"lambdaRoutes":' +
      aliasRecord.LambdaRoutes +
      ',"prerenders":' +
      aliasRecord.Prerenders +
      ',"deploymentId":' +
      '"' +
      aliasRecord.DeploymentId +
      '"' +
      '}',
    headers: {
      'cache-control': [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000',
        },
      ],
      'content-type': [
        {
          key: 'Content-Type',
          value: 'application/json',
        },
      ],
    },
  };
}

export { getAlias };
