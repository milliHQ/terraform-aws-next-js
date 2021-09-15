import { DynamoDB } from 'aws-sdk';

const jp = require('jsonpath');

const dynamoDB = new DynamoDB();

interface ListDeploymentProps {
  terraformState: any;
  target?: 'AWS';
}

async function listDeploymentsCommand({
  terraformState,
  target = 'AWS',
}: ListDeploymentProps) {
  const dynamoTable = jp.query(terraformState, '$..*[?(@.type=="aws_dynamodb_table" && @.name=="proxy_config")]');
  const proxyConfigTable = dynamoTable[0].values.name;

  const response = await dynamoDB.scan({
    TableName: proxyConfigTable,
    ProjectionExpression: "#A, #AT",
    ExpressionAttributeNames: {
      "#A": "alias",
      "#AT": "aliasedTo",
     },
  }).promise();

  const aliases = response.Items;

  if (!aliases || aliases.length === 0) {
    console.log('There are currently no deployments.');
    return;
  }

  const deployments: any = {};
  for (const alias of aliases) {
    if (alias.aliasedTo?.S && alias.alias?.S) { // If this is an alias
      deployments[alias.aliasedTo.S] = deployments[alias.aliasedTo.S] || [];
      deployments[alias.aliasedTo.S].push(alias.alias.S);
    } else if (alias.alias?.S) {                // If this is a deployment
      deployments[alias.alias.S] = deployments[alias.alias.S] || [];
    }
  }

  for (const deployment of Object.keys(deployments)) {
    const deploymentAliases = deployments[deployment] === []
      ? '' :
      `, aliases: [${deployments[deployment].join(', ')}]`;
    console.log(`${deployment}${deploymentAliases}`);
  }
}

export default listDeploymentsCommand;
