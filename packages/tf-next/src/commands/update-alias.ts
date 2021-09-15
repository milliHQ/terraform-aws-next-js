import { DynamoDB } from 'aws-sdk';

const jp = require('jsonpath');

const dynamoDB = new DynamoDB();

interface UpdateAliasProps {
  deploymentId: string;
  alias?: string;
  parent: boolean;
  terraformState: any;
  target?: 'AWS';
}

async function updateAliasCommand({
  deploymentId,
  alias,
  parent,
  terraformState,
  target = 'AWS',
}: UpdateAliasProps) {
  const dynamoTable = jp.query(terraformState, '$..*[?(@.type=="aws_dynamodb_table" && @.name=="proxy_config")]');
  const proxyConfigTable = dynamoTable[0].values.name;

  // Read existing proxy config for deployment
  const proxyConfig = await dynamoDB.getItem({
    TableName: proxyConfigTable,
    Key: {
      alias: {S: deploymentId},
    }
  }).promise();

  if (!proxyConfig.Item?.proxyConfig) {
    throw new Error(`Could not find existing deployment ${deploymentId}.`);
  }

  // Write new alias
  await dynamoDB.putItem({
    TableName: proxyConfigTable,
    Item: {
      alias: {
        S: parent ? ':root:' : alias,
      },
      proxyConfig: proxyConfig.Item.proxyConfig,
      aliasedTo: {S: deploymentId},
    },
  }).promise();
}

export default updateAliasCommand;
