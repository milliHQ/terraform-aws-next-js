import DynamoDB from 'aws-sdk/clients/dynamodb';

import { createDeployment } from '../../src';
import {
  createTestDynamoDBClient,
  createDeploymentTestTable,
} from '../test-utils';

describe('CreateDeployment', () => {
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

  test('Put item into the database', async () => {
    const createdDate = new Date();

    const result = await createDeployment({
      deploymentId: 'abc',
      deploymentTableName,
      dynamoDBClient,
      createdDate,
    });

    expect(result.$response.error).toBeNull();
  });
});
