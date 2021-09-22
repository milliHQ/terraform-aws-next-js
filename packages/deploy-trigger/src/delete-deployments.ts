import { ApiGatewayV2, CloudWatchLogs, DynamoDB, IAM, Lambda, S3 } from 'aws-sdk';
import { inspect } from 'util';
import { DeploymentConfiguration, ProxyConfig } from './types';

const apiGatewayV2 = new ApiGatewayV2();
const cloudWatch = new CloudWatchLogs();
const dynamoDB = new DynamoDB();
const iam = new IAM();
const lambda = new Lambda();
const s3 = new S3();

interface DeleteDeploymentsProps {
  whatToDelete: any;
  config: DeploymentConfiguration;
}

interface DeleteDeploymentProps {
  deploymentId: string;
  config: DeploymentConfiguration;
}

async function deleteIAM(
  deploymentId: string,
  lambdaNames: string[],
  config: DeploymentConfiguration,
) {
  for (const key of lambdaNames) {
    const functionName = `${key}-${deploymentId}`;
    const logGroupName = `/aws/lambda/${functionName}`;

    await cloudWatch.deleteLogGroup({
      logGroupName,
    }).promise();

    await iam.detachRolePolicy({
      PolicyArn: config.lambdaLoggingPolicyArn,
      RoleName: functionName,
    }).promise();

    if (config.lambdaAttachToVpc) {
      await iam.detachRolePolicy({
        PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
        RoleName: functionName,
      }).promise();
    }

    await iam.deleteRole({
      RoleName: functionName,
    }).promise();
  }
}

async function deleteLambdas(
  deploymentId: string,
  lambdaNames: string[],
) {
  for (const key of lambdaNames) {
    await lambda.deleteFunction({
      FunctionName: `${key}-${deploymentId}`,
    }).promise();
  }
}

async function deleteAPIGateway(
  apiId: string,
) {
  await apiGatewayV2.deleteApi({
    ApiId: apiId,
  }).promise();
}

async function deleteLambdaPermissions(
  deploymentId: string,
  lambdaNames: string[],
) {
  for (const key of lambdaNames) {
    await lambda.removePermission({
      FunctionName: `${key}-${deploymentId}`,
      StatementId: 'AllowInvokeFromApiGateway',
    }).promise();
  }
}

async function deleteProxyConfig(
  deploymentId: string,
  bucket: string,
  table: string,
) {
  await s3.deleteObject({
    Bucket: bucket,
    Key: `${deploymentId}/proxy-config.json`,
  }).promise();

  const response = await dynamoDB.scan({
    TableName: table,
    ProjectionExpression: "#A",
    ExpressionAttributeNames: {
      "#A": "alias",
      "#AT": "aliasedTo",
    },
    ExpressionAttributeValues: {
      ":at": {
        S: deploymentId,
      }
    },
    FilterExpression: "#AT = :at",
  }).promise();

  const aliasItems = response.Items || [];
  const aliases = aliasItems.map((i) => i.alias?.S).filter((a) => !!a);
  aliases.push(deploymentId);

  for (const alias of aliases) {
    log(deploymentId, `removing entry from proxy config table for ${alias}`);

    await dynamoDB.deleteItem({
      TableName: table,
      Key: {
        alias: {S: alias},
      },
    }).promise();
  }
}

function log(deploymentId: string, message: string) {
  console.log(`Deployment ${deploymentId}: ${message}`);
}

async function fetchProxyConfig(
  alias: string,
  table: string,
): Promise<ProxyConfig> {
  const item = await dynamoDB.getItem({
    TableName: table,
    Key: {
      alias: { S: alias },
    }
  }).promise();

  if (item.Item?.proxyConfig?.S) {
    try {
      const config = JSON.parse(item.Item.proxyConfig.S);
      return config as ProxyConfig;
    } catch (err) {
      throw new Error(`Could not parse proxy config for ${alias}: ${inspect(err)}`);
    }
  } else {
    throw new Error(`Could not fetch proxy config for ${alias}`);
  }
}

async function deleteDeployment({
  deploymentId,
  config,
}: DeleteDeploymentProps) {
  const proxyConfig = await fetchProxyConfig(deploymentId, config.proxyConfigTable);
  // /__NEXT_API_LAMBDA_0 -> __NEXT_API_LAMBDA_0
  const lambdaNames = proxyConfig.lambdaRoutes.map((r) => r.slice(1));

  // Delete lambda permissions
  await deleteLambdaPermissions(
    deploymentId,
    lambdaNames,
  );

  log(deploymentId, 'deleted lambda permissions.');

  // Delete API Gateway
  if (proxyConfig.apiId) {
    await deleteAPIGateway(
      proxyConfig.apiId,
    );
  }

  log(deploymentId, 'deleted API gateway.');

  // Delete lambdas
  await deleteLambdas(
    deploymentId,
    lambdaNames,
  );

  log(deploymentId, 'deleted lambda functions.');

  // Delete IAM & CW resources
  await deleteIAM(
    deploymentId,
    lambdaNames,
    config,
  );

  log(deploymentId, 'deleted log groups and roles.');

  // Delete proxy config
  await deleteProxyConfig(
    deploymentId,
    config.proxyConfigBucket,
    config.proxyConfigTable,
  );

  log(deploymentId, 'deleted proxy config.');

  // Delete static assets
  const files = await s3.listObjects({
    Bucket: config.staticDeployBucket,
    Prefix: deploymentId,
  }).promise();

  if (files.Contents) {
    const Objects: S3.ObjectIdentifierList = files.Contents.filter((file) => file.Key)
      .map((file) => ({ Key: file.Key! }));

    if (Objects.length > 0) {
      await s3.deleteObjects({
        Bucket: config.staticDeployBucket,
        Delete: { Objects },
      }).promise();
    }
  }
}

async function deleteDeployments({
  whatToDelete,
  config,
}: DeleteDeploymentsProps): Promise<string> {
  if (whatToDelete.deploymentId) {
    await deleteDeployment({
      deploymentId: whatToDelete.deploymentId,
      config,
    });

    return whatToDelete.deploymentId;
  } else if (whatToDelete.tag) {
    // Fetch all deployments for tag
    const response = await dynamoDB.scan({
      TableName: config.proxyConfigTable,
      ProjectionExpression: "#A, #T",
      ExpressionAttributeNames: {
        "#T": "tag",
        "#A": "alias",
      },
      ExpressionAttributeValues: {
        ":t": {
          S: whatToDelete.tag,
        }
      },
      FilterExpression: "#T = :t",
    }).promise();

    const deploymentItems = response.Items || [];
    const deployments = deploymentItems.map((i) => i.alias?.S).filter((a) => !!a);

    console.log(`Starting to delete deployments ${deployments.join(', ')}.`);

    // and delete them one by one
    for (const deploymentId of deployments) {
      if (deploymentId) {
        await deleteDeployment({
          deploymentId,
          config,
        });
      }
    }

    return deployments.join(', ');
  } else {
    throw new Error(`Could not identify what to delete. Please specify either 'deploymentId' or 'tag'.`);
  }
}

export default deleteDeployments;