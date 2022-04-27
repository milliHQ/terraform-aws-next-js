import { CloudFrontRequestEvent, CloudFrontResultResponse } from 'aws-lambda';
import { DynamoDB, S3 } from 'aws-sdk';

import { deploymentFileExists } from './actions/deployment-file-exists';
import { getAlias } from './actions/get-alias';
import { NotFoundError } from './errors/not-found-error';
import { getEnv } from './utils/get-env';

// Things that can be reused on different runs of the same Lambda, saving
// performance
let dynamoDBClient: DynamoDB;
let s3Client: S3;

async function handler(
  event: CloudFrontRequestEvent
): Promise<CloudFrontResultResponse> {
  try {
    const { request } = event.Records[0].cf;
    // Remove leading `/` from the uri
    const uri = request.uri.substring(1);

    const dynamoDBRegion = getEnv(request, 'x-env-dynamodb-region');
    const dynamoDBTable = getEnv(request, 'x-env-dynamodb-table-aliases');
    const bucketRegion = getEnv(request, 'x-env-bucket-region');
    const bucketId = getEnv(request, 'x-env-bucket-id');

    // Initialize clients
    if (!dynamoDBClient) {
      dynamoDBClient = new DynamoDB({
        region: dynamoDBRegion,
      });
    }

    if (!s3Client) {
      s3Client = new S3({
        region: bucketRegion,
      });
    }

    const [action, restUri] = uri.split(/\/(.*)/);

    switch (action) {
      case 'aliases':
        return getAlias({
          dynamoDBClient,
          dynamoDBTable,
          uri: restUri,
        });

      case 'deployment-file-exists':
        return deploymentFileExists({
          s3Client,
          s3BucketId: bucketId,
          uri: restUri,
        });

      default:
        throw new NotFoundError('Method does not exist.');
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      return error.toCloudFrontResponse();
    }

    // Unhandled error
    console.error(error);

    return {
      status: '500',
      body: 'Something went wrong.',
    };
  }
}

export { handler };
