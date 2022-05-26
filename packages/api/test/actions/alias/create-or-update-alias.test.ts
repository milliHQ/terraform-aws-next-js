import { createDeployment, createAlias } from '@millihq/tfn-dynamodb-actions';
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

describe('CreateOrUpdateAlias', () => {
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

  test('RequestBody: Missing', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
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

  test('RequestBody: Missing alias', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        target: 'abc',
      },
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

  test('RequestBody: Alias not an URL', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'abc',
        target: 'abc',
      },
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

  test('RequestBody: Alias is URL with protocol', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'http://example.com',
        target: 'abc',
      },
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

  test('RequestBody: Alias is URL with querystring', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'example.com?hello=world',
        target: 'abc',
      },
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

  test('RequestBody: Missing target', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'abc',
      },
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

  test('RequestBody: Target is invalid alias', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'valid.example.com',
        target: 'http://invalid.target',
      },
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
      message: 'Parameter target is not a valid alias.',
    });
  });

  test('Alias from deploymentId: Deployment does not exist', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'from-deployment-id.example.com',
        target: 'missingDeployment',
      },
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
      code: 'INVALID_DEPLOYMENT_ID',
      status: 400,
      message: 'Deployment with id missingDeployment does not exist.',
    });
  });

  test('Alias from deploymentId: Valid request', async () => {
    await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'aliasFromDeploymentId',
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'from-deployment-id.example.com',
        target: 'aliasFromDeploymentId',
      },
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
      id: 'from-deployment-id.example.com/',
      deployment: 'aliasFromDeploymentId',
    });
  });

  test('Alias from deploymentId: Override forbidden', async () => {
    await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'overrideForbidden',
    });

    await createAlias({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      aliasTableName: dynamoDBService.getAliasTableName(),
      deploymentId: 'overrideForbidden',
      hostnameRev: 'com.example.override-forbidden',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'override-forbidden.example.com',
        target: 'overrideForbidden',
      },
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
      code: 'ALIAS_OVERRIDE_NOT_ALLOWED',
      status: 400,
      message:
        'Cannot override existing alias override-forbidden.example.com because override flag is not set.',
    });
  });

  test('Alias from deploymentId: Override allowed', async () => {
    await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'oldOverrideAllowed',
    });

    await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'newOverrideAllowed',
    });

    await createAlias({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      aliasTableName: dynamoDBService.getAliasTableName(),
      deploymentId: 'oldOverrideAllowed',
      hostnameRev: 'com.example.override-allowed',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'override-allowed.example.com',
        target: 'newOverrideAllowed',
        override: true,
      },
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
      id: 'override-allowed.example.com/',
      deployment: 'newOverrideAllowed',
    });
  });

  test('Alias from Alias: Alias does not exist', async () => {
    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'from-deployment-id.example.com',
        target: 'missing-alias-example.com',
      },
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
      code: 'INVALID_ALIAS',
      status: 400,
      message: 'Alias target missing-alias-example.com does not exist.',
    });
  });

  test('Alias from Alias: Existing alias is deployment alias', async () => {
    await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'deploymentWithAlias',
    });

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
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'deployment-alias.example.com',
        target: 'deploymentWithAlias',
      },
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
        'Cannot override existing alias deployment-alias.example.com because it is a deployment alias that cannot be changed.',
    });
  });

  test('Alias from Alias: Valid request', async () => {
    await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'aliasfromalias',
    });

    await createAlias({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      aliasTableName: dynamoDBService.getAliasTableName(),
      deploymentId: 'aliasfromalias',
      hostnameRev: 'com.example.existing-alias',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/aliases',
      method: 'POST',
      body: {
        alias: 'alias-from-alias.example.com',
        target: 'existing-alias.example.com',
      },
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
      id: 'alias-from-alias.example.com/',
      deployment: 'aliasfromalias',
    });
  });
});
