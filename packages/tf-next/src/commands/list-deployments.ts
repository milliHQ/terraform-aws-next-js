import { DynamoDB } from 'aws-sdk';

const jp = require('jsonpath');

const dynamoDB = new DynamoDB();

interface ListDeploymentProps {
  terraformState: any;
  target?: 'AWS';
}

interface Deployment {
  deploymentId: string;
  aliases: string[];
  createdAt: Date;
  tag?: string;
}

async function listDeploymentsCommand({
  terraformState,
  target = 'AWS',
}: ListDeploymentProps) {
  const dynamoTable = jp.query(terraformState, '$..*[?(@.type=="aws_dynamodb_table" && @.name=="proxy_config")]');
  const proxyConfigTable = dynamoTable[0].values.name;

  const response = await dynamoDB.scan({
    TableName: proxyConfigTable,
    ProjectionExpression: "#A, #AT, #CA, #T",
    ExpressionAttributeNames: {
      "#A": "alias",
      "#AT": "aliasedTo",
      "#CA": "createdAt",
      "#T": "tag",
     },
  }).promise();

  const aliases = response.Items;

  if (!aliases || aliases.length === 0) {
    console.log('There are currently no deployments.');
    return;
  }

  const deployments: {[deploymentId: string]: Deployment} = {};
  for (const alias of aliases) {
    if (alias.aliasedTo?.S && alias.alias?.S) { // If this is an alias
      deployments[alias.aliasedTo.S] = deployments[alias.aliasedTo.S] || {
        deploymentId: alias.aliasedTo.S,
        aliases: [],
        createdAt: new Date(),
      };
      deployments[alias.aliasedTo.S]?.aliases.push(alias.alias.S);
    } else if (alias.alias?.S) {                // If this is a deployment
      deployments[alias.alias.S] = deployments[alias.alias.S] || {
        deploymentId: alias.alias.S,
        aliases: [],
        createdAt: alias.createdAt?.S ? new Date(alias.createdAt.S) : new Date(),
        tag: alias.tag?.S,
      };
    }
  }

  console.table(
    Object.values(deployments).sort((d1, d2) => d1.createdAt < d2.createdAt ? 1 : -1),
    ['deploymentId', 'aliases', 'createdAt', 'tag'],
  );
}

export default listDeploymentsCommand;
