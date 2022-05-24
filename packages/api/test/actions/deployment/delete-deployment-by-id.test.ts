import {
  createAlias,
  createDeployment,
  getDeploymentById,
  updateDeploymentStatusFinished,
} from '@millihq/tfn-dynamodb-actions';
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

describe('DeleteDeployment', () => {
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

  test('Deployment without aliases', async () => {
    await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'deploymentWithoutAlias',
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/deployments/deploymentWithoutAlias',
      method: 'DELETE',
    });
    const response = (await api.run(
      event as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;
    expect(response).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 204,
      isBase64Encoded: false,
    });

    const getDeploymentResponse = await getDeploymentById({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'deploymentWithoutAlias',
    });
    expect(getDeploymentResponse).toBeNull();
  });

  test('Deployment with deployment alias', async () => {
    const deployment = await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'deploymentWithAlias',
    });
    await createAlias({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      aliasTableName: dynamoDBService.getAliasTableName(),
      deploymentId: 'deploymentWithAlias',
      hostnameRev: 'com.with-alias',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
      isDeploymentAlias: true,
    });
    await updateDeploymentStatusFinished({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: {
        PK: deployment.PK,
        SK: deployment.SK,
      },
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/deployments/deploymentWithAlias',
      method: 'DELETE',
    });
    const response = (await api.run(
      event as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;
    expect(response).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 204,
      isBase64Encoded: false,
    });
  });
});
