import { pseudoRandomBytes } from 'crypto';
import { URL } from 'url';

import {
  createTestDynamoDBClient,
  createAliasTestTable,
  createDeploymentTestTable,
} from '@millihq/tfn-dynamodb-actions/test/test-utils';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import S3 from 'aws-sdk/clients/s3';

import { CloudFormationServiceType } from '../src/services/cloudformation';
import { DynamoDBServiceType } from '../src/services/dynamodb';
import { S3ServiceType } from '../src/services/s3';

/**
 * Helper to create a new bucket
 */
async function createS3Bucket(
  s3: S3,
  bucketName: string = pseudoRandomBytes(16).toString('hex')
) {
  await s3
    .createBucket({
      Bucket: bucketName,
    })
    .promise();

  return {
    bucketName,
    async destroy() {
      // Empty bucket and destroy it
      // We can't delete a bucket before emptying its contents
      const { Contents } = await s3
        .listObjects({ Bucket: bucketName })
        .promise();
      if (Contents && Contents.length > 0) {
        // TypeGuard
        function isObjectIdentifier(
          obj: S3.Object
        ): obj is S3.ObjectIdentifier {
          return typeof obj.Key === 'string';
        }

        await s3
          .deleteObjects({
            Bucket: bucketName,
            Delete: {
              Objects: Contents.filter(isObjectIdentifier).map(({ Key }) => ({
                Key,
              })),
            },
          })
          .promise();
      }
      await s3.deleteBucket({ Bucket: bucketName }).promise();
    },
  };
}

async function mockS3Service(): Promise<[S3ServiceType, () => Promise<void>]> {
  const s3Client = new S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,

    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    sslEnabled: false,
  });

  // Create temporary bucket
  const bucket = await createS3Bucket(s3Client);

  return [
    class S3ServiceMock {
      static s3Client: S3 = s3Client;

      static getS3Client(): S3 {
        return s3Client;
      }

      static getUploadBucketName(): string {
        return bucket.bucketName;
      }
    },
    bucket.destroy,
  ];
}

async function mockDynamoDBService(): Promise<
  [DynamoDBServiceType, () => Promise<void>]
> {
  const dynamoDBClient = createTestDynamoDBClient();
  const aliasTableName = await createAliasTestTable(dynamoDBClient);
  const deploymentTableName = await createDeploymentTestTable(dynamoDBClient);

  async function destroyCallback() {
    await dynamoDBClient.deleteTable({
      TableName: aliasTableName,
    });
    await dynamoDBClient.deleteTable({
      TableName: deploymentTableName,
    });
  }

  return [
    class DynamoDBServiceMock {
      static dynamoDBClient: DynamoDB = dynamoDBClient;

      static getDynamoDBClient() {
        return dynamoDBClient;
      }

      static getAliasTableName() {
        return aliasTableName;
      }

      static getDeploymentTableName() {
        return deploymentTableName;
      }
    },
    destroyCallback,
  ];
}

function mockCloudFormationService(): CloudFormationServiceType {
  return class CloudFormationServiceMock {
    static deleteStack(_stackName: string) {
      return Promise.resolve();
    }
  };
}

type CreateAPIGatewayProxyEventV2Options = {
  uri: string;
  method?: 'GET' | 'POST' | 'DELETE' | string;
  body?: any | undefined;
};

function createAPIGatewayProxyEventV2({
  uri,
  method = 'GET',
  body,
}: CreateAPIGatewayProxyEventV2Options): APIGatewayProxyEventV2 {
  const url = new URL(uri, 'http://n');
  let requestBody: string | undefined;

  if (body !== undefined) {
    requestBody = JSON.stringify(body);
  }

  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: url.pathname,
    rawQueryString: url.searchParams.toString(),
    cookies: [],
    headers: {},
    queryStringParameters: Object.fromEntries(url.searchParams),
    requestContext: {
      accountId: '123456789012',
      apiId: 'api-id',
      domainName: 'id.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'id',
      http: {
        method,
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: 'IP',
        userAgent: 'agent',
      },
      requestId: 'id',
      routeKey: '$default',
      stage: '$default',
      time: '12/Mar/2020:19:03:58 +0000',
      timeEpoch: 1583348638390,
    },
    body: requestBody,
    isBase64Encoded: false,
  };
}

export {
  mockS3Service,
  mockDynamoDBService,
  mockCloudFormationService,
  createAPIGatewayProxyEventV2,
};
