import { ApiGatewayV2, CloudWatchLogs, IAM, Lambda, S3 } from 'aws-sdk';
import { promises } from 'fs';
import { query } from 'jsonpath';
import * as path from 'path';
import { inspect } from 'util';

const apiGatewayV2 = new ApiGatewayV2();
const cloudWatch = new CloudWatchLogs();
const iam = new IAM();
const lambda = new Lambda();
const s3 = new S3();

// "lambdas": {
//   "__NEXT_API_LAMBDA_0": {
//     "handler": "now__launcher.launcher",
//     "runtime": "nodejs14.x",
//     "filename": "lambdas/__NEXT_API_LAMBDA_0.zip",
//     "route": "/__NEXT_API_LAMBDA_0"
//   },
//   "__NEXT_PAGE_LAMBDA_0": {
//     "handler": "now__launcher.launcher",
//     "runtime": "nodejs14.x",
//     "filename": "lambdas/__NEXT_PAGE_LAMBDA_0.zip",
//     "route": "/__NEXT_PAGE_LAMBDA_0"
//   }
// },

type LogLevel = 'verbose' | 'none' | undefined;

interface CreateDeploymentProps {
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

type LambdaArns = {[key: string]: string};
type RoleArns = {[key: string]: string};

const assumeRolePolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}`;

async function createIAM(
  deploymentId: string,
  lambdaConfigurations: LambdaConfigurations,
  terraformState: any,
): Promise<RoleArns> {
  const roleArns: RoleArns = {};

  const lambdaLoggingPolicy = query(terraformState, '$..*[?(@.type=="aws_iam_policy" && @.name=="lambda_logging")]');
  if (lambdaLoggingPolicy.length === 0) {
    throw new Error('Please first run `terraform apply` before trying to create deployments via `tf-next create-deployment`.');
  }

  for (const key in lambdaConfigurations) {
    const functionName = `${key}-${deploymentId}`;

    // TODO: Handle lambda_role_permissions_boundary
    const role = await iam.createRole({
      AssumeRolePolicyDocument: assumeRolePolicy,
      RoleName: functionName,
      Description: 'Managed by Terraform Next.js',
      Tags: [], // TODO
    }).promise();
    roleArns[key] = role.Role.Arn;

    const logGroupName = `/aws/lambda/${functionName}`;

    await cloudWatch.createLogGroup({
      logGroupName,
      // TODO: tags: {},
    }).promise();

    await cloudWatch.putRetentionPolicy({
      logGroupName,
      retentionInDays: 14,
    }).promise();

    await iam.attachRolePolicy({
      PolicyArn: lambdaLoggingPolicy[0].values.arn,
      RoleName: functionName,
    }).promise();
  }

  return roleArns;
}

async function createLambdas(
  deploymentId: string,
  configDir: string,
  defaultRuntime: string,
  defaultFunctionMemory: number,
  lambdaTimeout: number,
  lambdaConfigurations: LambdaConfigurations,
  roleArns: RoleArns,
): Promise<LambdaArns> {
  const arns: LambdaArns = {};

  // TODO: Do we ever need to update existing functions, or do we just always create new ones?

  for (const key in lambdaConfigurations) {
    const fileContent = await promises.readFile(path.join(configDir, lambdaConfigurations[key].filename));
    const createdLambda = await lambda.createFunction({
      Code: {
        ZipFile: fileContent,
      },
      FunctionName: `${key}-${deploymentId}`,
      Role: roleArns[key],
      Description: 'Managed by Terraform-next.js',
      Environment: {
        Variables: {}, // TODO: Should get this from somewhere
      },
      Handler: lambdaConfigurations[key].handler || '',
      MemorySize: lambdaConfigurations[key].memory || defaultFunctionMemory,
      PackageType: 'Zip', // Default in TF
      Publish: false, // Default in TF
      Runtime: lambdaConfigurations[key].runtime || defaultRuntime,
      Tags: {}, // TODO
      Timeout: lambdaTimeout,
      VpcConfig: {}, // TODO: Should get this from somewhere
      //   dynamic "vpc_config" {
      //     for_each = var.lambda_attach_to_vpc ? [true] : []
      //     content {
      //       security_group_ids = var.vpc_security_group_ids
      //       subnet_ids         = var.vpc_subnet_ids
      //     }
      //   }
    }).promise();

    if (createdLambda.FunctionArn) {
      arns[key] = createdLambda.FunctionArn;
    } else {
      throw new Error(`Created lambda does not have arn: ${inspect(createdLambda)}`);
    }
  }

  return arns;
}

async function createAPIGateway(
  deploymentId: string,
  deploymentName: string,
  lambdaTimeout: number,
  lambdaConfigurations: LambdaConfigurations,
  lambdaArns: LambdaArns,
  terraformState: any,
): Promise<{ apiId: string, executeArn: string }> {
  // TODO: This needs to be fixed, so we select the correct topic
  const snsTopics = query(terraformState, '$..*[?(@.type=="aws_sns_topic" && @.name=="this")]');
  if (snsTopics.length === 0) {
    throw new Error('Please first run `terraform apply` before trying to create deployments via `tf-next create-deployment`.');
  }

  const api = await apiGatewayV2.createApi({
    Name: `${deploymentName} - ${deploymentId}`,
    ProtocolType: 'HTTP',
    ApiKeySelectionExpression: '$request.header.x-api-key',
    Description: 'Managed by Terraform-next.js',
    RouteSelectionExpression: '$request.method $request.path',
    Tags: {},
  }).promise();

  if (api.ApiId === undefined) {
    throw new Error(`Created API gateway does not have an id: ${inspect(api)}`);
  }

  const stage = await apiGatewayV2.createStage({
    ApiId: api.ApiId,
    StageName: '$default',
    AutoDeploy: true,
    Description: 'Managed by Terraform-next.js',
    // TODO: Tags: {},
  }).promise();

  for (const key in lambdaConfigurations) {
    const integration = await apiGatewayV2.createIntegration({
      ApiId: api.ApiId,
      IntegrationType: 'AWS_PROXY',
      Description: 'Managed by Terraform-next.js',
      IntegrationMethod: 'POST',
      IntegrationUri: lambdaArns[key],
      PayloadFormatVersion: '2.0',
      TimeoutInMillis: lambdaTimeout * 1000,
    }).promise();

    await apiGatewayV2.createRoute({
      ApiId: api.ApiId,
      RouteKey: `ANY ${lambdaConfigurations[key].route}/{proxy+}`,
      AuthorizationType: 'NONE', // TODO
      Target: `integrations/${integration.IntegrationId}`,
    }).promise();
  }

  // TODO: # VPC Link (Private API)
  // resource "aws_apigatewayv2_vpc_link" "this" {
  //   for_each = var.create && var.create_vpc_link ? var.vpc_links : {}

  //   name               = lookup(each.value, "name", each.key)
  //   security_group_ids = each.value["security_group_ids"]
  //   subnet_ids         = each.value["subnet_ids"]

  //   tags = merge(var.tags, var.vpc_link_tags, lookup(each.value, "tags", {}))
  // }

  const snsTopic = snsTopics.find((topic) => topic.values.arn.includes('tf-next'));

  if (!snsTopic) {
    throw new Error(`Could not find SNS topic created by tf-next.`);
  }

  // TODO: Find a better way to get this information
  const topicArn = snsTopic.values.arn.split(':');
  const region = topicArn[3];
  const accountId = topicArn[4];

  // The ARN prefix to be used in an aws_lambda_permission's source_arn attribute or in an aws_iam_policy to authorize access to the @connections API.
  return {
    apiId: api.ApiId,
    executeArn: `arn:aws:execute-api:${region}:${accountId}:${api.ApiId}`,
  };
}

async function createLambdaPermissions(
  deploymentId: string,
  lambdaConfigurations: LambdaConfigurations,
  executeArn: string,
) {
  for (const key in lambdaConfigurations) {
    await lambda.addPermission({
      Action: 'lambda:InvokeFunction',
      FunctionName: `${key}-${deploymentId}`,
      Principal: 'apigateway.amazonaws.com',
      StatementId: 'AllowInvokeFromApiGateway',
      SourceArn: `${executeArn}/*/*/*`,
    }).promise();
  }
}

function log(deploymentId: string, message: string, logLevel: LogLevel) {
  if (logLevel === 'verbose') {
    console.log(`Deployment ${deploymentId}: ${message}`);
  }
}

async function createDeploymentCommand({
  deploymentId,
  logLevel,
  cwd,
  terraformState,
  target = 'AWS',
}: CreateDeploymentProps) {
  // TODO:
  //    make lambdaTimeout configurable
  //    make deploymentName configurable
  //    make defaultRuntime configurable
  //    allow tags to be passed through

  const lambdaTimeout = 10;
  const deploymentName = 'tf-next';
  const defaultRuntime = 'nodejs14.x';
  const defaultFunctionMemory = 1024;

  const configDir = path.join(cwd, '.next-tf');
  const configFile = require(path.join(configDir, 'config.json'));
  const lambdaConfigurations = configFile.lambdas;

  // Create IAM & CW resources
  const roleArns = await createIAM(
    deploymentId,
    lambdaConfigurations,
    terraformState,
  );

  log(deploymentId, 'created log groups and roles.', logLevel);

  // Create lambdas
  const lambdaArns = await createLambdas(
    deploymentId,
    configDir,
    defaultRuntime,
    defaultFunctionMemory,
    lambdaTimeout,
    lambdaConfigurations,
    roleArns,
  );

  log(deploymentId, 'created lambda functions.', logLevel);

  // Create API Gateway
  const { apiId, executeArn } = await createAPIGateway(
    deploymentId,
    deploymentName,
    lambdaTimeout,
    lambdaConfigurations,
    lambdaArns,
    terraformState,
  );

  log(deploymentId, 'created API gateway.', logLevel);

  // Create lambda permissions
  await createLambdaPermissions(
    deploymentId,
    lambdaConfigurations,
    executeArn,
  );

  log(deploymentId, 'created lambda permissions.', logLevel);

  // Modify proxy config to include API Gateway id
  configFile.apiId = apiId;

  // Upload proxy config to bucket
  const s3Bucket = query(terraformState, '$..*[?(@.type=="aws_s3_bucket" && @.name=="proxy_config_store")]');
  if (s3Bucket.length === 0) {
    throw new Error('Please first run `terraform apply` before trying to create deployments via `tf-next create-deployment`.');
  }

  await s3.putObject({
    Body: JSON.stringify(configFile),
    Bucket: s3Bucket[0].values.bucket,
    ContentType: 'application/json',
    Key: `${deploymentId}/proxy-config.json`,
  }).promise();

  log(deploymentId, 'created proxy config.', logLevel);

  // Image optimizer stuff
  // Upload static assets
}

export default createDeploymentCommand;
