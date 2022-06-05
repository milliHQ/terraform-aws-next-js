import {
  createAlias,
  createDeployment,
  getDeploymentById,
  updateDeploymentStatusCreateInProgress,
  updateDeploymentStatusFinished,
} from '@millihq/tfn-dynamodb-actions';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { API } from 'lambda-api';

import { createApi } from '../../../src/api';
import { CloudFormationServiceType } from '../../../src/services/cloudformation';
import { DynamoDBServiceType } from '../../../src/services/dynamodb';
import {
  mockS3Service,
  mockDynamoDBService,
  createAPIGatewayProxyEventV2,
  mockCloudFormationService,
} from '../../test-utils';

describe('DeleteDeployment', () => {
  let api: API;
  let cloudFormationService: CloudFormationServiceType;
  let dynamoDBService: DynamoDBServiceType;
  let s3CleanupCallback: () => Promise<void>;
  let dynamoDBCleanupCallback: () => Promise<void>;

  beforeAll(async () => {
    api = createApi();

    const s3Mock = await mockS3Service();
    api.app('s3', s3Mock[0]);
    s3CleanupCallback = s3Mock[1];

    const dynamoDBMock = await mockDynamoDBService();
    api.app('dynamoDB', dynamoDBMock[0]);
    dynamoDBService = dynamoDBMock[0];
    dynamoDBCleanupCallback = dynamoDBMock[1];
  });

  beforeEach(() => {
    // Insert mocks
    cloudFormationService = mockCloudFormationService();
    api.app('cloudFormation', cloudFormationService);
  });

  afterAll(async () => {
    await s3CleanupCallback();
    await dynamoDBCleanupCallback();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('CloudFormation fail', async () => {
    console.error = jest.fn();
    const stackDeleteError = new Error('Throw from deleteStack');

    /**
     * Mock for the cloudFormationService that fails when
     */
    function mockFailedCloudFormationService(): CloudFormationServiceType {
      return class CloudFormationServiceMock {
        static deleteStack(_stackName: string) {
          return Promise.reject(stackDeleteError);
        }
      };
    }
    api.app('cloudFormation', mockFailedCloudFormationService());

    const deployment = await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'deploymentDeletionFails',
    });

    // Status: INITIALIZED -> CREATE_IN-PROGRESS
    await updateDeploymentStatusCreateInProgress({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: {
        PK: deployment.PK,
        SK: deployment.SK,
      },
      prerenders: 'foo',
      routes: 'bar',
      cloudFormationStack:
        'arn:aws:cloudformation:eu-central-1:123456789123:stack/tfn-d35de1a94815e0562689b89b6225cd85/319a93a0-c3df-11ec-9e1a-0a226e11de6a',
    });

    // Status: CREATE_IN-PROGRESS -> FINISHED
    await updateDeploymentStatusFinished({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: {
        PK: deployment.PK,
        SK: deployment.SK,
      },
    });

    const event = createAPIGatewayProxyEventV2({
      uri: '/deployments/deploymentDeletionFails',
      method: 'DELETE',
    });
    const response = (await api.run(
      event as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;
    expect(response).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 500,
      isBase64Encoded: false,
    });
    expect(JSON.parse(response.body!)).toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
    });
    expect(console.error).toHaveBeenCalledWith(stackDeleteError);
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
    // Insert temporary mock
    const deleteStackSpy = jest.spyOn(cloudFormationService, 'deleteStack');

    // Status: INITIALIZED
    const deployment = await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'deploymentWithAlias',
    });

    // Status: INITIALIZED -> CREATE_IN-PROGRESS
    await updateDeploymentStatusCreateInProgress({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: {
        PK: deployment.PK,
        SK: deployment.SK,
      },
      prerenders: 'foo',
      routes: 'bar',
      cloudFormationStack:
        'arn:aws:cloudformation:eu-central-1:123456789123:stack/tfn-d35de1a94815e0562689b89b6225cd85/319a93a0-c3df-11ec-9e1a-0a226e11de6a',
    });

    // Status: CREATE_IN-PROGRESS -> FINISHED
    await updateDeploymentStatusFinished({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: {
        PK: deployment.PK,
        SK: deployment.SK,
      },
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
      statusCode: 200,
      isBase64Encoded: false,
    });
    expect(JSON.parse(response.body!)).toMatchObject({
      status: 'DESTROY_REQUESTED',
    });
    expect(deleteStackSpy).toHaveBeenCalledTimes(1);
  });

  test('Deployment with custom alias', async () => {
    const deployment = await createDeployment({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      deploymentTableName: dynamoDBService.getDeploymentTableName(),
      deploymentId: 'deploymentWithMultipleAliases',
    });

    // Deployment alias
    await createAlias({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      aliasTableName: dynamoDBService.getAliasTableName(),
      deploymentId: 'deploymentWithMultipleAliases',
      hostnameRev: 'com.with-multiple-alias',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
      isDeploymentAlias: true,
    });
    // Custom alias
    await createAlias({
      dynamoDBClient: dynamoDBService.getDynamoDBClient(),
      aliasTableName: dynamoDBService.getAliasTableName(),
      deploymentId: 'deploymentWithMultipleAliases',
      hostnameRev: 'com.with-multiple-alias.custom',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
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
      uri: '/deployments/deploymentWithMultipleAliases',
      method: 'DELETE',
    });
    const response = (await api.run(
      event as any,
      {} as any
    )) as APIGatewayProxyStructuredResultV2;
    expect(response).toMatchObject({
      headers: { 'content-type': 'application/json' },
      statusCode: 400,
      isBase64Encoded: false,
    });
    expect(JSON.parse(response.body!)).toMatchObject({});
  });
});
