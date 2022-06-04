import { createAlias, createDeployment } from '@millihq/tfn-dynamodb-actions';
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

describe('ListAliases', () => {
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

  test('Missing deploymentId', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
    });

    const result = (await api.run(
      event as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;

    expect(result).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 400,
      isBase64Encoded: false,
    });
    expect(JSON.parse(result.body!)).toMatchObject({
      code: 'INVALID_PARAMS',
      status: 400,
      message: 'Required parameter deploymentId is invalid or missing.',
    });
  });

  test('No aliases with deploymentId', async () => {
    await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'deploymentIdWithoutAliases',
    });

    const event = createAPIGatewayProxyEventV2({
      uri: `/aliases?deploymentId=${encodeURIComponent(
        'deploymentIdWithoutAliases'
      )}`,
    });

    const result = (await api.run(
      event as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;

    expect(result).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 200,
      isBase64Encoded: false,
    });
    expect(JSON.parse(result.body!)).toMatchObject({
      metadata: {
        next: null,
      },
      items: [],
    });
  });

  test('Provided deployment id does not exist', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: `/aliases?deploymentId=${encodeURIComponent(
        'notExistingDeployment'
      )}`,
    });

    const result = (await api.run(
      event as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;

    expect(result).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 404,
      isBase64Encoded: false,
    });
  });

  test('Pagination', async () => {
    await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'paginationDeployment',
    });

    // Create some entries first
    for (let index = 1; index <= 30; index++) {
      await createAlias({
        dynamoDBClient: dynamoDBService.getDynamoDBClient(),
        aliasTableName: dynamoDBService.getAliasTableName(),
        deploymentId: 'paginationDeployment',
        hostnameRev: `com.pagination.${index}`,
        lambdaRoutes: '',
        prerenders: '',
        routes: '',
        createDate: new Date(2022, 0, index),
      });
    }

    const event1 = createAPIGatewayProxyEventV2({
      uri: `/aliases?deploymentId=${encodeURIComponent(
        'paginationDeployment'
      )}`,
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
        next: `com.pagination.6#/#paginationDeployment#${new Date(
          2022,
          0,
          30 - 24
        ).toISOString()}`,
      },
      items: expect.any(Array),
    });
    expect(parsedBody1.items.length).toBe(25);

    // Paginated request
    const event2 = createAPIGatewayProxyEventV2({
      uri: `/aliases?deploymentId=${encodeURIComponent(
        'paginationDeployment'
      )}&startAt=${encodeURIComponent(parsedBody1.metadata.next)}`,
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
