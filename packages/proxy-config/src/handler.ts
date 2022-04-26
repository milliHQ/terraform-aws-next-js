import { getAliasById } from '@millihq/tfn-dynamodb-actions';
import { CloudFrontRequestEvent, CloudFrontResultResponse } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

async function handler(
  event: CloudFrontRequestEvent
): Promise<CloudFrontResultResponse> {
  try {
    const { request } = event.Records[0].cf;
    // Remove leading `/` from the uri
    const uri = request.uri.substring(1);
    const alias = decodeURI(uri);

    if (!request.origin?.custom?.customHeaders['x-env-dynamodb-region'][0]) {
      throw new Error('DynamoDB Region not set');
    }

    if (
      !request.origin?.custom?.customHeaders['x-env-dynamodb-table-aliases'][0]
    ) {
      throw new Error('DynamoDB Table not set');
    }

    const dynamoDBRegion =
      request.origin.custom.customHeaders['x-env-dynamodb-region'][0].value;
    const dynamoDBTable =
      request.origin.custom.customHeaders['x-env-dynamodb-table-aliases'][0]
        .value;

    const dynamoDBClient = new DynamoDB({
      region: dynamoDBRegion,
    });

    const aliasRecord = await getAliasById({
      aliasId: alias,
      aliasTableName: dynamoDBTable,
      dynamoDBClient,
      attributes: {
        Routes: true,
        Prerenders: true,
        StaticRoutes: true,
        DeploymentId: true,
      },
    });

    if (!aliasRecord) {
      return {
        status: '404',
        body: `No Alias found for ${alias}`,
      };
    }

    // For performance reasons we build the JSON response here manually, since
    // the records in the database are already stringified JSON objects.
    return {
      status: '200',
      body:
        '{"routes":' +
        aliasRecord.Routes +
        ',"prerenders":' +
        aliasRecord.Prerenders +
        ',"staticRoutes":' +
        aliasRecord.StaticRoutes +
        ',"deploymentId":' +
        '"' +
        aliasRecord.DeploymentId +
        '"' +
        '}',
      headers: {
        'cache-control': [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60',
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
  } catch (error) {
    console.error(error);

    return {
      status: '500',
      body: 'Something went wrong.',
    };
  }
}

export { handler };
