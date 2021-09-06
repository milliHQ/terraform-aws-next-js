import { ApiGatewayV2, CloudWatchLogs, IAM, Lambda, S3 } from 'aws-sdk';
import { query } from 'jsonpath';
import * as path from 'path';

const apiGatewayV2 = new ApiGatewayV2();
const cloudWatch = new CloudWatchLogs();
const iam = new IAM();
const lambda = new Lambda();
const s3 = new S3();

type LogLevel = 'verbose' | 'none' | undefined;

interface DeleteDeploymentProps {
  deploymentId: string;
  logLevel: LogLevel;
  cwd: string;
  terraformState: any;
  target?: 'AWS';
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
  terraformState: any,
) {
  const lambdaLoggingPolicy = query(terraformState, '$..*[?(@.type=="aws_iam_policy" && @.name=="lambda_logging")]');
  if (lambdaLoggingPolicy.length === 0) {
    throw new Error('Please first run `terraform apply` before trying to create deployments via `tf-next create-deployment`.');
  }

  for (const key in lambdaConfigurations) {
    const functionName = `${key}-${deploymentId}`;
    const logGroupName = `/aws/lambda/${functionName}`;

    await cloudWatch.deleteLogGroup({
      logGroupName,
    }).promise();

    await iam.detachRolePolicy({
      PolicyArn: lambdaLoggingPolicy[0].values.arn,
      RoleName: functionName,
    }).promise();

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
  const configDir = path.join(cwd, '.next-tf');
  const configFile = require(path.join(configDir, 'config.json'));
  const lambdaConfigurations = configFile.lambdas;
  const deploymentName = 'tf-next';

  // Delete lambda permissions
  await deleteLambdaPermissions(
    deploymentId,
    lambdaConfigurations,
  );

  log(deploymentId, 'deleted lambda permissions.', logLevel);

  // Delete API Gateway
  await deleteAPIGateway(
    deploymentId,
    deploymentName,
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
    terraformState,
  );

  log(deploymentId, 'deleted log groups and roles.', logLevel);

  // Delete proxy config from bucket
  const s3Bucket = query(terraformState, '$..*[?(@.type=="aws_s3_bucket" && @.name=="proxy_config_store")]');
  if (s3Bucket.length === 0) {
    throw new Error('Please first run `terraform apply` before trying to create deployments via `tf-next create-deployment`.');
  }

  await s3.deleteObject({
    Bucket: s3Bucket[0].values.bucket,
    Key: `${deploymentId}/proxy-config.json`,
  }).promise();

  log(deploymentId, 'deleted proxy config.', logLevel);

  // Image optimizer stuff
  // Upload static assets
}

export default deleteDeploymentCommand;
