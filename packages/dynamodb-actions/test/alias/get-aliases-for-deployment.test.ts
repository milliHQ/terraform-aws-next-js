import DynamoDB from 'aws-sdk/clients/dynamodb';

import { createAlias, getAliasesForDeployment } from '../../src';
import { createAliasTestTable, createTestDynamoDBClient } from '../test-utils';

describe('GetAliasesForDeployment', () => {
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

  test('Get alias for deploymentId', async () => {
    // Fill with aliases
    await Promise.all(
      ['1.deployment1.com', '2.deployment1.com', '3.deployment1.com'].map(
        (alias, index) => {
          return createAlias({
            dynamoDBClient,
            aliasTableName,
            alias,
            createdDate: new Date(2022, 0, index + 1),
            deploymentId: 'deployment1',
            lambdaRoutes: '',
            prerenders: '',
            routes: '',
          });
        }
      )
    );

    await Promise.all(
      ['1.deployment2.com', '2.deployment2.com', '3.deployment2.com'].map(
        (alias, index) => {
          return createAlias({
            dynamoDBClient,
            aliasTableName,
            alias,
            createdDate: new Date(2022, 0, index + 1),
            deploymentId: 'deployment2',
            lambdaRoutes: '',
            prerenders: '',
            routes: '',
          });
        }
      )
    );

    const result = await getAliasesForDeployment({
      aliasTableName,
      dynamoDBClient,
      deploymentId: 'deployment1',
    });
  });
});
