import { createDeployment } from '@millihq/tfn-dynamodb-actions';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { API } from 'lambda-api';

import { createApi } from '../../../src/api';
import { DynamoDBServiceType } from '../../../src/services/dynamodb';
import {
  mockS3Service,
  mockDynamoDBService,
  createAPIGatewayProxyEventV2,
  mockCloudFormationService,
} from '../../test-utils';

describe('CreateDeployment', () => {
  let api: API;
  let dynamoDBService: DynamoDBServiceType;
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
    dynamoDBService = dynamoDBMock[0];
    dynamoDBCleanupCallback = dynamoDBMock[1];
  });

  afterAll(async () => {
    await s3CleanupCallback();
    await dynamoDBCleanupCallback();
  });

  test('Valid listDeployments request', async () => {
    // Create some entries first
    for (let index = 1; index <= 30; index++) {
      await createDeployment({
        dynamoDBClient: dynamoDBService.getDynamoDBClient(),
        deploymentTableName: dynamoDBService.getDeploymentTableName(),
        deploymentId: `deployment${index}`,
        createDate: new Date(2022, 0, index),
      });
    }

    const event1 = createAPIGatewayProxyEventV2({
      uri: '/deployments',
    });

    const response1 = (await api.run(
      event1 as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;
    expect(response1).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 200,
      isBase64Encoded: false,
    });
    const parsedBody1 = JSON.parse(response1.body!);
    expect(parsedBody1).toMatchObject({
      metadata: {
        next: `deployment6#${new Date(2022, 0, 30 - 24).toISOString()}`,
      },
      items: expect.any(Array),
    });
    expect(parsedBody1.items.length).toBe(25);

    // Paginated request
    const event2 = createAPIGatewayProxyEventV2({
      uri: `/deployments?startAt=${encodeURIComponent(
        parsedBody1.metadata.next
      )}`,
    });

    const response2 = (await api.run(
      event2 as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;
    const parsedBody2 = JSON.parse(response2.body!);
    expect(parsedBody2).toMatchObject({
      metadata: {
        next: null,
      },
      items: expect.any(Array),
    });
    expect(parsedBody2.items.length).toBe(5);
  });
});
