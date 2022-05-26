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

describe('GetDeploymentById', () => {
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

  test('Deployment not found', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/deployments/notExistingDeployment',
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
    expect(JSON.parse(result.body!)).toMatchObject({
      code: 'DEPLOYMENT_NOT_FOUND',
      status: 404,
      message: `Deployment with id "notExistingDeployment" does not exist.`,
    });
  });

  test('Valid request', async () => {
    const createDate = new Date();
    const deployment = await createDeployment({
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentId: 'someDeployment',
      createDate,
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/deployments/someDeployment',
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
      id: deployment.DeploymentId,
      createDate: createDate.toISOString(),
      status: deployment.Status,
    });
  });
});
