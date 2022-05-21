import { pseudoRandomBytes } from 'crypto';

import DynamoDB from 'aws-sdk/clients/dynamodb';

function createTestDynamoDBClient() {
  return new DynamoDB({
    endpoint: 'http://localhost:8000',
    region: 'mock',
    credentials: {
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
    },
  });
}

async function createAliasTestTable(dynamoDBClient: DynamoDB) {
  const tableName = pseudoRandomBytes(16).toString('hex');

  // Uses the same definition as in main.tf (in the project root)
  await dynamoDBClient
    .createTable({
      BillingMode: 'PAY_PER_REQUEST',
      TableName: tableName,
      AttributeDefinitions: [
        {
          AttributeName: 'PK',
          AttributeType: 'S',
        },
        {
          AttributeName: 'SK',
          AttributeType: 'S',
        },
        {
          AttributeName: 'CreateDate',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'PK',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'SK',
          KeyType: 'RANGE',
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 0,
        WriteCapacityUnits: 0,
      },
    })
    .promise();

  return tableName;
}

async function createDeploymentTestTable(dynamoDBClient: DynamoDB) {
  const tableName = pseudoRandomBytes(16).toString('hex');

  // Uses the same definition as in main.tf (in the project root)
  await dynamoDBClient
    .createTable({
      BillingMode: 'PAY_PER_REQUEST',
      TableName: tableName,
      AttributeDefinitions: [
        {
          AttributeName: 'PK',
          AttributeType: 'S',
        },
        {
          AttributeName: 'SK',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'PK',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'SK',
          KeyType: 'RANGE',
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 0,
        WriteCapacityUnits: 0,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: 'CreateDateIndex',
          KeySchema: [
            {
              AttributeName: 'CreateDate',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'PK',
              KeyType: 'RANGE',
            },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
        },
      ],
    })
    .promise();

  return tableName;
}

export {
  createDeploymentTestTable,
  createAliasTestTable,
  createTestDynamoDBClient,
};
