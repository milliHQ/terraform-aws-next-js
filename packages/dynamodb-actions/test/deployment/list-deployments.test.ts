import DynamoDB from 'aws-sdk/clients/dynamodb';

import { createDeployment, listDeployments } from '../../src';
import {
  createTestDynamoDBClient,
  createDeploymentTestTable,
} from '../test-utils';

describe('ListDeployments', () => {
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

  test('Get the latest deployments', async () => {
    // Create 20 fake deployments
    for (let index = 1; index <= 20; index++) {
      const deploymentId = `test${index}`;

      await createDeployment({
        dynamoDBClient,
        deploymentTableName,
        deploymentId,
        createDate: new Date(2022, 0, index),
      });
    }

    // First batch
    const result1 = await listDeployments({
      deploymentTableName,
      dynamoDBClient,
      limit: 10,
    });

    expect(result1.meta.count).toBe(10);
    expect(result1.meta.lastKey!.deploymentId).toBe('test11');

    // Second batch
    const result2 = await listDeployments({
      deploymentTableName,
      dynamoDBClient,
      limit: 5,
      startKey: result1.meta.lastKey!,
    });

    expect(result2.meta.count).toBe(5);
    expect(result2.meta.lastKey!.deploymentId).toBe('test6');

    // Last batch
    const result3 = await listDeployments({
      deploymentTableName,
      dynamoDBClient,
      limit: 10,
      startKey: result2.meta.lastKey!,
    });

    expect(result3.meta.count).toBe(5);
    expect(result3.meta.lastKey).toBeNull();
  });
});
