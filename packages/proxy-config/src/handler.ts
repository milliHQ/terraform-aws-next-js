import { CloudFrontRequestEvent, CloudFrontResultResponse } from 'aws-lambda';
import { DynamoDB, S3 } from 'aws-sdk';

import { deploymentFileExists } from './actions/deployment-file-exists';
import { getAlias } from './actions/get-alias';
import { NotFoundError } from './errors/not-found-error';
import { getEnv } from './utils/get-env';
import { splitAtCharacter } from './utils/split-at-character';

// Things that can be reused on different runs of the same Lambda, saving
// performance
let dynamoDBClient: DynamoDB;
let s3Client: S3;

async function handler(
  event: CloudFrontRequestEvent
): Promise<CloudFrontResultResponse> {
  try {
    const { request } = event.Records[0].cf;

    // Split the uri at after the action
    // /<action>/<restUri>
    //          ^-- Split here
    // We start at index 1, to ignore the first `/`
    const [action, restUri] = splitAtCharacter(request.uri, '/', 1);

    switch (action) {
      // /aliases/<alias-id>
      case 'aliases':
        if (!dynamoDBClient) {
          const dynamoDBRegion = getEnv(request, 'x-env-dynamodb-region');
          dynamoDBClient = new DynamoDB({
            region: dynamoDBRegion,
          });
        }

        const dynamoDBTable = getEnv(request, 'x-env-dynamodb-table-aliases');
        // Awaited return allows error catch
        return await getAlias({
          dynamoDBClient,
          dynamoDBTable,
          uri: restUri,
        });

      // /filesystem/<deployment-id>/<file-path>
      case 'filesystem':
        if (!s3Client) {
          const bucketRegion = getEnv(request, 'x-env-bucket-region');
          s3Client = new S3({
            region: bucketRegion,
          });
        }

        const bucketId = getEnv(request, 'x-env-bucket-id');
        // Awaited return allows error catch
        return await deploymentFileExists({
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
