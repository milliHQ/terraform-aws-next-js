import DynamoDB from 'aws-sdk/clients/dynamodb';

import { createDeployment, getDeploymentById } from '../../src';
import {
  createTestDynamoDBClient,
  createDeploymentTestTable,
} from '../test-utils';

describe('GetDeploymentById', () => {
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

  test('Get deployment by id', async () => {
    await createDeployment({
      dynamoDBClient,
      deploymentTableName,
      deploymentId: 'abc',
      createDate: new Date(2022, 0, 1),
    });

    const result = await getDeploymentById({
      dynamoDBClient,
      deploymentTableName,
      deploymentId: 'abc',
    });
    expect(result).not.toBeNull();
    expect(result!.DeploymentId).toBe('abc');
    expect(result!.CreateDate).toBe(new Date(2022, 0, 1).toISOString());
  });

  test('Deployment does not exist', async () => {
    const result = await getDeploymentById({
      dynamoDBClient,
      deploymentTableName,
      deploymentId: 'doesNotExist',
    });
    expect(result).toBeNull();
  });
});
