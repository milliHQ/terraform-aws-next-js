import DynamoDB from 'aws-sdk/clients/dynamodb';

type DynamoDBServiceType = typeof DynamoDBService;

class DynamoDBService {
  static dynamoDBClient: DynamoDB;

  static getDynamoDBClient() {
    if (!DynamoDBService.dynamoDBClient) {
      DynamoDBService.dynamoDBClient = new DynamoDB({
        region: process.env.TABLE_REGION,
      });
    }

    return DynamoDBService.dynamoDBClient;
  }

  static getAliasTableName() {
    return process.env.TABLE_NAME_ALIASES;
  }

  static getDeploymentTableName() {
    return process.env.TABLE_NAME_DEPLOYMENTS;
  }
}

export type { DynamoDBServiceType };
export { DynamoDBService };
