import DynamoDB from 'aws-sdk/clients/dynamodb';

import {
  createDeployment,
  getDeploymentById,
  updateDeploymentStatusCreateInProgress,
  updateDeploymentStatusFinished,
} from '../../src';
import {
  createTestDynamoDBClient,
  createDeploymentTestTable,
} from '../test-utils';

describe('Update deployment', () => {
  let dynamoDBClient: DynamoDB;
  let deploymentTableName: string;

  beforeAll(async () => {
    dynamoDBClient = createTestDynamoDBClient();

    // Create table
    deploymentTableName = await createDeploymentTestTable(dynamoDBClient);
  });

  afterAll(async () => {
    await dynamoDBClient
      .deleteTable({
        TableName: deploymentTableName,
      })
      .promise();
  });

  test('Status: Create in progress', async () => {
    const deploymentId = 'statusCreateInProgress';
    const deployment = await createDeployment({
      dynamoDBClient,
      deploymentTableName,
      deploymentId,
    });
    const expectedObject = {
      ...deployment,
      Prerenders: 'foo',
      Routes: 'bar',
      Status: 'CREATE_IN_PROGRESS',
      LambdaRoutes: '{}',
    };

    const updateResponse = await updateDeploymentStatusCreateInProgress({
      dynamoDBClient,
      deploymentTableName,
      deploymentId,
      prerenders: 'foo',
      routes: 'bar',
      cloudFormationStack:
        'arn:aws:cloudformation:eu-central-1:123456789123:stack/tfn-d35de1a94815e0562689b89b6225cd85/319a93a0-c3df-11ec-9e1a-0a226e11de6a',
    });
    expect(updateResponse).toMatchObject(expectedObject);

    const updatedDeployment = await getDeploymentById({
      dynamoDBClient,
      deploymentTableName,
      deploymentId,
    });
    expect(updatedDeployment).toMatchObject(expectedObject);
  });

  test('Status: Finished', async () => {
    const deploymentId = 'statusFinished';
    const deployment = await createDeployment({
      dynamoDBClient,
      deploymentTableName,
      deploymentId,
    });
    const expectedObject = {
      ...deployment,
      Prerenders: 'foo',
      Routes: 'bar',
      Status: 'FINISHED',
      LambdaRoutes: '{}',
    };

    // INITIALIZED -> CREATE_IN_PROGRESS
    await updateDeploymentStatusCreateInProgress({
      dynamoDBClient,
      deploymentTableName,
      deploymentId,
      prerenders: 'foo',
      routes: 'bar',
      cloudFormationStack:
        'arn:aws:cloudformation:eu-central-1:123456789123:stack/tfn-d35de1a94815e0562689b89b6225cd85/319a93a0-c3df-11ec-9e1a-0a226e11de6a',
    });

    // CREATE_IN_PROGRESS -> FINISHED
    const updateResponse = await updateDeploymentStatusFinished({
      dynamoDBClient,
      deploymentTableName,
      deploymentId,
    });
    expect(updateResponse).toMatchObject(expectedObject);

    const updatedDeployment = await getDeploymentById({
      dynamoDBClient,
      deploymentTableName,
      deploymentId,
    });
    expect(updatedDeployment).toMatchObject(expectedObject);
  });
});
