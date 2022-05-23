import DynamoDB from 'aws-sdk/clients/dynamodb';

import { DeploymentItem, DeploymentTemplateType } from '../types';

const { marshall } = DynamoDB.Converter;

type CreatedDeploymentItem = Pick<
  DeploymentItem,
  | 'PK'
  | 'SK'
  | 'GSI1SK'
  | 'DeploymentId'
  | 'CreateDate'
  | 'ItemVersion'
  | 'Status'
  | 'DeploymentTemplate'
>;

type CreateDeploymentOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the deployments.
   */
  deploymentTableName: string;
  /**
   * Id of the deployment (must be unique).
   */
  deploymentId: string;
  /**
   * Date when the deployment was created.
   */
  createDate?: Date;
  /**
   * Template that should be used for deployment.
   */
  templateType?: DeploymentTemplateType;
};

/**
 * Creates and initializes a new deployment.
 */
async function createDeployment({
  dynamoDBClient,
  deploymentTableName,
  deploymentId,
  createDate = new Date(),
  templateType = 'FUNCTION_URLS',
}: CreateDeploymentOptions): Promise<CreatedDeploymentItem> {
  const createDateString = createDate.toISOString();
  const deploymentItemToCreate: CreatedDeploymentItem = {
    // Keys
    PK: 'DEPLOYMENTS',
    SK: `D#${deploymentId}`,
    GSI1SK: `${createDateString}#D#${deploymentId}`,

    // Attributes
    DeploymentId: deploymentId,
    CreateDate: createDateString,
    ItemVersion: 1,
    Status: 'INITIALIZED',
    DeploymentTemplate: templateType,
  };

  const response = await dynamoDBClient
    .putItem({
      TableName: deploymentTableName,
      Item: marshall(deploymentItemToCreate),
    })
    .promise();

  if (response.$response.error) {
    throw response.$response.error;
  }

  return deploymentItemToCreate;
}

export { createDeployment };
