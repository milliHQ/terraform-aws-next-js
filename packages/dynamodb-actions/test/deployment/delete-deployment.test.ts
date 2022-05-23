import DynamoDB from 'aws-sdk/clients/dynamodb';

import {
  createDeployment,
  deleteDeploymentById,
  getDeploymentById,
} from '../../src';
import {
  createTestDynamoDBClient,
  createDeploymentTestTable,
} from '../test-utils';

describe('DeleteDeploymentById', () => {
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

  test('Delete a single deployment from database', async () => {
    await createDeployment({
      dynamoDBClient,
      deploymentTableName,
      deploymentId: 'deploymentToDelete',
    });

    const response1 = await getDeploymentById({
      dynamoDBClient,
      deploymentTableName,
      deploymentId: 'deploymentToDelete',
    });
    expect(response1).not.toBeNull();

    const response2 = await deleteDeploymentById({
      dynamoDBClient,
      deploymentTableName,
      deploymentId: 'deploymentToDelete',
    });
    expect(response2).not.toBeNull();

    const response3 = await getDeploymentById({
      dynamoDBClient,
      deploymentTableName,
      deploymentId: 'deploymentToDelete',
    });
    expect(response3).toBeNull();
  });

  test('Delete a deployment by PK and SK', async () => {
    await createDeployment({
      dynamoDBClient,
      deploymentTableName,
      deploymentId: 'deploymentToDelete',
    });
  })
});
