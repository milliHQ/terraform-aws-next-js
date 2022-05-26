import { createAlias } from '@millihq/tfn-dynamodb-actions';
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

describe('DeleteAliasById', () => {
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

  test('Invalid aliasId', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases/hello',
      method: 'DELETE',
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
    });
  });

  test('Alias not found', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases/not-existing.example.com',
      method: 'DELETE',
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
      code: 'ALIAS_NOT_FOUND',
      status: 404,
      message: 'The requested alias does not exist.',
    });
  });

  test('DeploymentAlias', async () => {
    // Create deployment Alias
    await createAlias({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      aliasTableName: dynamoDBService.getAliasTableName(),
      deploymentId: 'deploymentWithAlias',
      hostnameRev: 'com.example.deployment-alias',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
      isDeploymentAlias: true,
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases/deployment-alias.example.com',
      method: 'DELETE',
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
      code: 'DEPLOYMENT_ALIAS',
      status: 400,
      message:
        'Requested alias cannot be deleted since it is a deployment alias. Can only be deleted when the deployment gets deleted.',
    });
  });

  test('Without basePath', async () => {
    // Create deployment Alias
    await createAlias({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      aliasTableName: dynamoDBService.getAliasTableName(),
      deploymentId: 'withoutBasePathDeployment',
      hostnameRev: 'com.example.without-basepath',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases/without-basepath.example.com',
      method: 'DELETE',
    });

    const result = (await api.run(
      event as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;

    expect(result).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 204,
      isBase64Encoded: false,
    });
  });

  test('With basePath', async () => {
    // Create deployment Alias
    await createAlias({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      aliasTableName: dynamoDBService.getAliasTableName(),
      deploymentId: 'withoutBasePathDeployment',
      hostnameRev: 'com.example.without-basepath',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
      basePath: '/1',
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases/without-basepath.example.com/1/',
      method: 'DELETE',
    });

    const result = (await api.run(
      event as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;

    expect(result).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 204,
      isBase64Encoded: false,
    });
  });
});
