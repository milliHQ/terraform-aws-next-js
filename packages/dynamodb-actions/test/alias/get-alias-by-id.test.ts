import DynamoDB from 'aws-sdk/clients/dynamodb';

import { createAlias, getAliasById } from '../../src';
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

  test('Retrieve an alias by hostname', async () => {
    await createAlias({
      dynamoDBClient,
      aliasTableName,
      deploymentId: 'abc',
      hostnameRev: 'com.example',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    const response = await getAliasById({
      dynamoDBClient,
      aliasTableName,
      hostnameRev: 'com.example',
    });
    expect(response).not.toBeNull();
    expect(response).toMatchObject({
      HostnameRev: 'com.example',
    });
  });

  test('Retrieve an alias by hostname with multiple matching', async () => {
    await createAlias({
      dynamoDBClient,
      aliasTableName,
      deploymentId: 'abc',
      hostnameRev: 'com.example',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    await createAlias({
      dynamoDBClient,
      aliasTableName,
      deploymentId: 'abc',
      hostnameRev: 'com.example.sub',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    await createAlias({
      dynamoDBClient,
      aliasTableName,
      deploymentId: 'abc',
      hostnameRev: 'com.example.sub1',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    {
      const response = await getAliasById({
        dynamoDBClient,
        aliasTableName,
        hostnameRev: 'com.example',
      });
      expect(response).not.toBeNull();
      expect(response).toMatchObject({
        HostnameRev: 'com.example',
      });
    }

    {
      const response = await getAliasById({
        dynamoDBClient,
        aliasTableName,
        hostnameRev: 'com.example.sub',
      });
      expect(response).not.toBeNull();
      expect(response).toMatchObject({
        HostnameRev: 'com.example.sub',
      });
    }

    {
      const response = await getAliasById({
        dynamoDBClient,
        aliasTableName,
        hostnameRev: 'com.example.sub1',
      });
      expect(response).not.toBeNull();
      expect(response).toMatchObject({
        HostnameRev: 'com.example.sub1',
      });
    }
  });
});
