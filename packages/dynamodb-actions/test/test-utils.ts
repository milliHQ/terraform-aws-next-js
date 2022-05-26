import { pseudoRandomBytes } from 'crypto';

import DynamoDB from 'aws-sdk/clients/dynamodb';

function createTestDynamoDBClient() {
  return new DynamoDB({
    endpoint: process.env.TEST_DYNAMO_ENDPOINT ?? 'http://localhost:8000',
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
  const response = await dynamoDBClient
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
          AttributeName: 'GSI1PK',
          AttributeType: 'S',
        },
        {
          AttributeName: 'GSI1SK',
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
          IndexName: 'DeploymentIdIndex',
          KeySchema: [
            {
              AttributeName: 'GSI1PK',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'GSI1SK',
              KeyType: 'RANGE',
            },
          ],
          Projection: {
            ProjectionType: 'INCLUDE',
            NonKeyAttributes: [
              'BasePath',
              'CreateDate',
              'DeploymentAlias',
              'DeploymentId',
              'HostnameRev',
            ],
          },
        },
      ],
    })
    .promise();

  if (response.$response.error) {
    throw response.$response.error;
  }

  return tableName;
}

async function createDeploymentTestTable(dynamoDBClient: DynamoDB) {
  const tableName = pseudoRandomBytes(16).toString('hex');

  // Uses the same definition as in main.tf (in the project root)
  const response = await dynamoDBClient
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
          AttributeName: 'GSI1SK',
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
        // GSI1SK: CreateDateIndex
        {
          IndexName: 'CreateDateIndex',
          KeySchema: [
            {
              AttributeName: 'PK',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'GSI1SK',
              KeyType: 'RANGE',
            },
          ],
          Projection: {
            ProjectionType: 'INCLUDE',
            NonKeyAttributes: [
              'DeploymentId',
              'CreateDate',
              'Status',
              'DeploymentAlias',
            ],
          },
        },
      ],
    })
    .promise();

  if (response.$response.error) {
    throw response.$response.error;
  }

  return tableName;
}

export {
  createDeploymentTestTable,
  createAliasTestTable,
  createTestDynamoDBClient,
};
