import DynamoDB from 'aws-sdk/clients/dynamodb';

import { createAlias } from '../../src';
import { createAliasTestTable, createTestDynamoDBClient } from '../test-utils';

const { unmarshall } = DynamoDB.Converter;

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
    const expectedObject = {
      PK: 'ROUTES',
      SK: 'com.example#/',
      GSI1PK: 'D#abc',
      GSI1SK: `${createDate.toISOString()}#R#com.example#/`,
    };
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
    expect(response).toMatchObject(expectedObject);

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
    expect(unmarshall(getItemResponse.Item!)).toMatchObject(expectedObject);
  });
});
