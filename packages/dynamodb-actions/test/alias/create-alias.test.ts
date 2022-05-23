import DynamoDB from 'aws-sdk/clients/dynamodb';

import { createAlias } from '../../src';
import { createAliasTestTable, createTestDynamoDBClient } from '../test-utils';

describe('CreateAlias', () => {
  let dynamoDBClient: DynamoDB;
  let aliasTableName: string;

  beforeAll(async () => {
    dynamoDBClient = createTestDynamoDBClient();

    // Create table
    aliasTableName = await createAliasTestTable(dynamoDBClient);
  });

  afterAll(async () => {
    await dynamoDBClient
      .deleteTable({
        TableName: aliasTableName,
      })
      .promise();
  });

  test('Insert new alias', async () => {
    const createDate = new Date(2022, 0, 1);
    const response = await createAlias({
      dynamoDBClient,
      aliasTableName,
      deploymentId: 'abc',
      hostnameRev: 'com.example',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
      createDate,
    });

    expect(response.$response.error).toBeNull();

    // Check keys
    const getItemResponse = await dynamoDBClient
      .getItem({
        Key: {
          PK: {
            S: 'ROUTES',
          },
          SK: {
            S: 'com.example#/',
          },
        },
        TableName: aliasTableName,
      })
      .promise();
    expect(getItemResponse.Item).toMatchObject({
      PK: {
        S: 'ROUTES',
      },
      SK: {
        S: 'com.example#/',
      },
      GSI1PK: {
        S: 'D#abc',
      },
      GSI1SK: {
        S: `${createDate.toISOString()}#R#com.example#/`,
      },
    });
  });
});
