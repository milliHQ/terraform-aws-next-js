import { DynamoDB } from 'aws-sdk';

const jp = require('jsonpath');

const dynamoDB = new DynamoDB();

interface DeleteAliasProps {
  alias?: string;
  terraformState: any;
  target?: 'AWS';
}

async function deleteAliasCommand({
  alias,
  terraformState,
  target = 'AWS',
}: DeleteAliasProps) {
  const dynamoTable = jp.query(terraformState, '$..*[?(@.type=="aws_dynamodb_table" && @.name=="proxy_config")]');
  const proxyConfigTable = dynamoTable[0].values.name;

  // Delete existing proxy config for deployment
  const response = await dynamoDB.deleteItem({
      TableName: proxyConfigTable,
      Key: {
          alias: {S: alias},
      },
      ReturnValues: 'ALL_OLD',
  }).promise();

  if (!response.Attributes) {
    throw new Error(`Could not find alias ${alias}.`);
  }
}

export default deleteAliasCommand;
