import DynamoDB from 'aws-sdk/clients/dynamodb';

import { createAlias, deleteAliasById, getAliasById } from '../../src';
import { createAliasTestTable, createTestDynamoDBClient } from '../test-utils';

describe('GetAliasById', () => {
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

  test('Delete alias by hostname and basePath', async () => {
    await createAlias({
      dynamoDBClient,
      aliasTableName,
      deploymentId: 'abc',
      hostnameRev: 'com.example',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    const getResponse1 = await getAliasById({
      dynamoDBClient,
      aliasTableName,
      hostnameRev: 'com.example',
    });
    expect(getResponse1).not.toBe(null);

    await deleteAliasById({
      dynamoDBClient,
      aliasTableName,
      hostnameRev: 'com.example',
      basePath: '/',
    });

    const getResponse2 = await getAliasById({
      dynamoDBClient,
      aliasTableName,
      hostnameRev: 'com.example',
    });
    expect(getResponse2).toBe(null);
  });

  test('Delete alias by sortKey', async () => {
    const alias = await createAlias({
      dynamoDBClient,
      aliasTableName,
      deploymentId: 'abc',
      hostnameRev: 'delete.by.sk',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    const getResponse1 = await getAliasById({
      dynamoDBClient,
      aliasTableName,
      hostnameRev: 'delete.by.sk',
    });
    expect(getResponse1).not.toBe(null);

    await deleteAliasById({
      dynamoDBClient,
      aliasTableName,
      SK: alias.SK,
    });

    const getResponse2 = await getAliasById({
      dynamoDBClient,
      aliasTableName,
      hostnameRev: 'delete.by.sk',
    });
    expect(getResponse2).toBe(null);
  });
});
