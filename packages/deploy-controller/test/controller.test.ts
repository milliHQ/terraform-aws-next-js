import {
  createTestDynamoDBClient,
  createAliasTestTable,
  createDeploymentTestTable,
} from '@millihq/tfn-dynamodb-actions/test/test-utils';
import DynamoDB from 'aws-sdk/clients/dynamodb';

import { Controller, createController } from '../src/controller';
import { createTestSNSEvent } from './test-utils';

describe('Deploy Controller', () => {
  let controller: Controller;
  let dynamoDBClient: DynamoDB;
  let aliasTableName: string;
  let deploymentTableName: string;

  beforeAll(async () => {
    dynamoDBClient = createTestDynamoDBClient();
    aliasTableName = await createAliasTestTable(dynamoDBClient);
    deploymentTableName = await createDeploymentTestTable(dynamoDBClient);
  });

  beforeEach(() => {
    controller = createController({
      dynamoDBClient,
    });
  });

  afterAll(async () => {
    await dynamoDBClient.deleteTable({
      TableName: aliasTableName,
    });
    await dynamoDBClient.deleteTable({
      TableName: deploymentTableName,
    });
  });

  test('No ResourceStatus present in event', async () => {
    const event = createTestSNSEvent({
      ResourceStatus: null,
    });
    await expect(
      controller.run(event, {
        aliasTableName,
        deploymentTableName,
      })
    ).rejects.toThrow(
      new Error('No attribute `ResourceStatus` present in event')
    );
  });

  test('No StackName present in event', async () => {
    const event = createTestSNSEvent({
      StackName: null,
    });
    await expect(
      controller.run(event, {
        aliasTableName,
        deploymentTableName,
      })
    ).rejects.toThrow(new Error('No attribute `StackName` present in event'));
  });

  test('CreateComplete: No StackId present in event', async () => {
    const event = createTestSNSEvent({
      ResourceStatus: 'CREATE_COMPLETE',
      StackId: null,
    });
    await expect(
      controller.run(event, {
        aliasTableName,
        deploymentTableName,
      })
    ).rejects.toThrow(new Error('CreateComplete: No StackId present'));
  });
});
