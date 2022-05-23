import DynamoDB from 'aws-sdk/clients/dynamodb';

import { createDeployment } from '../../src';
import {
  createTestDynamoDBClient,
  createDeploymentTestTable,
} from '../test-utils';

const { unmarshall } = DynamoDB.Converter;

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
    const createDate = new Date();

    const result = await createDeployment({
      deploymentId: 'abc',
      deploymentTableName,
      dynamoDBClient,
      createDate,
    });

    const resultItem = {
      PK: 'DEPLOYMENTS',
      SK: 'D#abc',
      GSI1SK: `${createDate.toISOString()}#D#abc`,
      DeploymentId: 'abc',
      CreateDate: createDate.toISOString(),
      ItemVersion: 1,
      Status: 'INITIALIZED',
      DeploymentTemplate: 'FUNCTION_URLS',
    };

    expect(result).toMatchObject(resultItem);

    // Check item in the database
    const getItemResponse = await dynamoDBClient
      .getItem({
        Key: {
          PK: {
            S: resultItem.PK,
          },
          SK: {
            S: resultItem.SK,
          },
        },
        TableName: deploymentTableName,
      })
      .promise();
    expect(unmarshall(getItemResponse.Item!)).toMatchObject(resultItem);
  });
});
