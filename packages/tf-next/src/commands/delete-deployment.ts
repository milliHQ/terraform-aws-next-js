import { ApiGatewayV2, CloudWatchLogs, DynamoDB, IAM, Lambda, S3 } from 'aws-sdk';
import * as path from 'path';
import { inspect } from 'util';

const jp = require('jsonpath');

const apiGatewayV2 = new ApiGatewayV2();
const cloudWatch = new CloudWatchLogs();
const dynamoDB = new DynamoDB();
const iam = new IAM();
const lambda = new Lambda();
const s3 = new S3();

type LogLevel = 'verbose' | 'none' | undefined;

interface DeleteDeploymentConfiguration {
  deploymentName: string;
  lambdaAttachToVpc: boolean;
  lambdaLoggingPolicyArn: string;
  proxyConfigBucket: string;
  proxyConfigTable: string;
  staticDeployBucket: string;
}

interface DeleteDeploymentProps {
  deploymentId: string;
  logLevel: LogLevel;
  cwd: string;
  terraformState: any;
  target?: 'AWS';
}

// TODO: Find a good way to read the deployment configuration (basically what is used
//   in `create-deployment`).
async function readConfig(terraformState: any): Promise<DeleteDeploymentConfiguration> {
  const lambdaLoggingPolicy = jp.query(terraformState, '$..*[?(@.type=="aws_iam_policy" && @.name=="lambda_logging")]');
  const existingFunction = jp.query(terraformState, '$..*[?(@.type=="aws_lambda_function" && @.index=="__NEXT_PAGE_LAMBDA_0")]');
  const proxyConfigStore = jp.query(terraformState, '$..*[?(@.type=="aws_s3_bucket" && @.name=="proxy_config_store")]');
  const staticDeploy = jp.query(terraformState, '$..*[?(@.type=="aws_s3_bucket" && @.name=="static_deploy")]');
  const proxyConfigTable = jp.query(terraformState, '$..*[?(@.type=="aws_dynamodb_table" && @.name=="proxy_config")]');

  if (lambdaLoggingPolicy.length === 0 || existingFunction.length === 0 ||
    proxyConfigStore.length === 0 || staticDeploy.length === 0) {
    throw new Error('Please first run `terraform apply` before trying to delete deployments via `tf-next delete-deployment`.');
  }

  const vpcConfig = existingFunction[0].values.vpc_config;

  try {
    return {
      deploymentName: 'tf-next',
      lambdaAttachToVpc: vpcConfig.length > 0,
      lambdaLoggingPolicyArn: lambdaLoggingPolicy[0].values.arn,
      proxyConfigBucket: proxyConfigStore[0].values.bucket,
      proxyConfigTable: proxyConfigTable[0].values.name,
      staticDeployBucket: staticDeploy[0].values.bucket,
    };
  } catch(err) {
    throw new Error(`Could not read configuration successfully: ${inspect(err, undefined, 10)}`);
  }
}

type LambdaConfigurations = {[key: string]: LambdaConfiguration};

interface LambdaConfiguration {
  handler: string;
  runtime: string;
  filename: string;
  route: string;
  memory?: number;
}

async function deleteIAM(
  deploymentId: string,
  lambdaConfigurations: LambdaConfigurations,
  config: DeleteDeploymentConfiguration,
) {
  for (const key in lambdaConfigurations) {
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
  lambdaConfigurations: LambdaConfigurations,
) {
  for (const key in lambdaConfigurations) {
    await lambda.deleteFunction({
      FunctionName: `${key}-${deploymentId}`,
    }).promise();
  }
}

async function deleteAPIGateway(
  deploymentId: string,
  deploymentName: string,
) {
  const apis = await apiGatewayV2.getApis({}).promise();
  const api = (apis.Items || []).find((api) => api.Name === `${deploymentName} - ${deploymentId}`);
  if (api && api.ApiId) {
    await apiGatewayV2.deleteApi({
      ApiId: api.ApiId,
    }).promise();
  }
}

async function deleteLambdaPermissions(
  deploymentId: string,
  lambdaConfigurations: LambdaConfigurations,
) {
  for (const key in lambdaConfigurations) {
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

  // TODO: Make sure there is no alias pointing to this deployment
  await dynamoDB.deleteItem({
    TableName: table,
    Key: {
      alias: {S: deploymentId},
    },
  }).promise();
}

function log(deploymentId: string, message: string, logLevel: LogLevel) {
  if (logLevel === 'verbose') {
    console.log(`Deployment ${deploymentId}: ${message}`);
  }
}

async function deleteDeploymentCommand({
  deploymentId,
  logLevel,
  cwd,
  terraformState,
  target = 'AWS',
}: DeleteDeploymentProps) {
  const config = await readConfig(terraformState);

  const configDir = path.join(cwd, '.next-tf');
  const configFile = require(path.join(configDir, 'config.json'));
  const lambdaConfigurations = configFile.lambdas;

  // Delete lambda permissions
  await deleteLambdaPermissions(
    deploymentId,
    lambdaConfigurations,
  );

  log(deploymentId, 'deleted lambda permissions.', logLevel);

  // Delete API Gateway
  await deleteAPIGateway(
    deploymentId,
    config.deploymentName,
  );

  log(deploymentId, 'deleted API gateway.', logLevel);

  // Delete lambdas
  await deleteLambdas(
    deploymentId,
    lambdaConfigurations,
  );

  log(deploymentId, 'deleted lambda functions.', logLevel);

  // Delete IAM & CW resources
  await deleteIAM(
    deploymentId,
    lambdaConfigurations,
    config,
  );

  log(deploymentId, 'deleted log groups and roles.', logLevel);

  // Delete proxy config
  await deleteProxyConfig(
    deploymentId,
    config.proxyConfigBucket,
    config.proxyConfigTable,
  );

  log(deploymentId, 'deleted proxy config.', logLevel);

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

  // Image optimizer stuff
}

export default deleteDeploymentCommand;
