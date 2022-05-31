import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { API } from 'lambda-api';

import { createApi } from '../../../src/api';
import {
  mockS3Service,
  mockDynamoDBService,
  createAPIGatewayProxyEventV2,
  mockCloudFormationService,
} from '../../test-utils';

describe('CreateDeployment', () => {
  let api: API;
  let s3CleanupCallback: () => Promise<void>;
  let dynamoDBCleanupCallback: () => Promise<void>;

  beforeAll(async () => {
    api = createApi();

    // Insert mocks
    api.app('cloudFormation', mockCloudFormationService());

    const s3Mock = await mockS3Service();
    api.app('s3', s3Mock[0]);
    s3CleanupCallback = s3Mock[1];

    const dynamoDBMock = await mockDynamoDBService();
    api.app('dynamoDB', dynamoDBMock[0]);
    dynamoDBCleanupCallback = dynamoDBMock[1];
  });

  afterAll(async () => {
    await s3CleanupCallback();
    await dynamoDBCleanupCallback();
  });

  test('Valid createDeployment request', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/deployments',
      method: 'POST',
    });

    const result = (await api.run(
      event as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;

    expect(result).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 201,
      isBase64Encoded: false,
    });
    expect(JSON.parse(result.body!)).toMatchObject({
      id: expect.any(String),
      uploadUrl: expect.any(String),
      uploadAttributes: {
        key: expect.any(String),
        'Content-Type': expect.any(String),
        'x-amz-meta-tf-next-deployment-id': expect.any(String),
        bucket: expect.any(String),
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': expect.any(String),
        'X-Amz-Date': expect.any(String),
        Policy: expect.any(String),
        'X-Amz-Signature': expect.any(String),
      },
      status: 'INITIALIZED',
    });
  });
});
