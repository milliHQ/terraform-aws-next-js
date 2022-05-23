import DynamoDB from 'aws-sdk/clients/dynamodb';

import { createAlias, listAliasesForDeployment } from '../../src';
import { createAliasTestTable, createTestDynamoDBClient } from '../test-utils';

describe('ListAliasesForDeployment', () => {
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

  test('List all alias for a deploymentId', async () => {
    // Fill with aliases
    await Promise.all(
      ['com.deployment1.1', 'com.deployment1.2', 'com.deployment1.3'].map(
        (hostnameRev, index) => {
          return createAlias({
            dynamoDBClient,
            aliasTableName,
            hostnameRev,
            createDate: new Date(2022, 0, 3 - index),
            deploymentId: 'deployment1',
            lambdaRoutes: '',
            prerenders: '',
            routes: '',
          });
        }
      )
    );

    await Promise.all(
      ['com.deployment2.1', 'com.deployment2.2', 'com.deployment2.3'].map(
        (hostnameRev, index) => {
          return createAlias({
            dynamoDBClient,
            aliasTableName,
            hostnameRev,
            createDate: new Date(2022, 0, index + 1),
            deploymentId: 'deployment2',
            lambdaRoutes: '',
            prerenders: '',
            routes: '',
          });
        }
      )
    );

    const result = await listAliasesForDeployment({
      aliasTableName,
      dynamoDBClient,
      deploymentId: 'deployment1',
    });

    expect(result.meta.count).toBe(3);
    expect(result.meta.lastKey).toBeNull();
    result.items.forEach((item) => {
      expect(item.DeploymentId).toBe('deployment1');
    });
  });

  test('Sort Order', async () => {
    // #2
    await createAlias({
      dynamoDBClient,
      aliasTableName,
      hostnameRev: 'com.sortorder.2',
      createDate: new Date(2022, 0, 2),
      deploymentId: 'sortOrderDeployment',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    // #1
    await createAlias({
      dynamoDBClient,
      aliasTableName,
      hostnameRev: 'com.sortorder.1',
      createDate: new Date(2022, 0, 3),
      deploymentId: 'sortOrderDeployment',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    // #3
    await createAlias({
      dynamoDBClient,
      aliasTableName,
      hostnameRev: 'com.sortorder.3',
      createDate: new Date(2022, 0, 1),
      deploymentId: 'sortOrderDeployment',
      lambdaRoutes: '',
      prerenders: '',
      routes: '',
    });

    const result1 = await listAliasesForDeployment({
      aliasTableName,
      dynamoDBClient,
      deploymentId: 'sortOrderDeployment',
      limit: 1,
    });

    expect(result1.meta.count).toBe(1);
    expect(result1.meta.lastKey).not.toBeNull();
    expect(result1.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          SK: 'com.sortorder.1#/',
          DeploymentId: 'sortOrderDeployment',
          CreateDate: new Date(2022, 0, 3).toISOString(),
        }),
      ])
    );

    const result2 = await listAliasesForDeployment({
      aliasTableName,
      dynamoDBClient,
      deploymentId: 'sortOrderDeployment',
      limit: 1,
      startKey: result1.meta.lastKey!,
    });

    expect(result2.meta.count).toBe(1);
    expect(result2.meta.lastKey).not.toBeNull();
    expect(result2.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          SK: 'com.sortorder.2#/',
          DeploymentId: 'sortOrderDeployment',
          CreateDate: new Date(2022, 0, 2).toISOString(),
        }),
      ])
    );

    const result3 = await listAliasesForDeployment({
      aliasTableName,
      dynamoDBClient,
      deploymentId: 'sortOrderDeployment',
      limit: 1,
      startKey: result2.meta.lastKey!,
    });

    expect(result3.meta.count).toBe(1);
    expect(result3.meta.lastKey).not.toBeNull();
    expect(result3.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          SK: 'com.sortorder.3#/',
          DeploymentId: 'sortOrderDeployment',
          CreateDate: new Date(2022, 0, 1).toISOString(),
        }),
      ])
    );

    const result4 = await listAliasesForDeployment({
      aliasTableName,
      dynamoDBClient,
      deploymentId: 'sortOrderDeployment',
      limit: 1,
      startKey: result3.meta.lastKey!,
    });

    expect(result4.meta.count).toBe(0);
    expect(result4.meta.lastKey).toBeNull();
  });
});
