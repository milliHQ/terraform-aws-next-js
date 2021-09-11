import { ApiGatewayV2, CloudWatchLogs, IAM, Lambda, S3 } from 'aws-sdk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { inspect } from 'util';

const jp = require('jsonpath');

const apiGatewayV2 = new ApiGatewayV2();
const cloudWatch = new CloudWatchLogs();
const iam = new IAM();
const lambda = new Lambda();
const s3 = new S3();

type LogLevel = 'verbose' | 'none' | undefined;

interface CreateDeploymentProps {
  deploymentId: string;
  logLevel: LogLevel;
  cwd: string;
  staticFilesArchive: string;
  terraformState: any;
  target?: 'AWS';
}

interface CreateDeploymentConfiguration {
  accountId: string;
  defaultRuntime: string;
  defaultFunctionMemory: number;
  deploymentName: string;
  lambdaAttachToVpc: boolean;
  lambdaEnvironmentVariables: Lambda.EnvironmentVariables;
  lambdaLoggingPolicyArn: string;
  lambdaTimeout: number;
  proxyConfigBucket: string;
  region: string;
  staticDeployBucket: string;
  vpcSecurityGroupIds: string[];
  vpcSubnetIds: string[];
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

// In the future this will be read from environment variables attached to the
// deploy-trigger configuration.
async function readConfig(terraformState: any): Promise<CreateDeploymentConfiguration> {
  const lambdaLoggingPolicy = jp.query(terraformState, '$..*[?(@.type=="aws_iam_policy" && @.name=="lambda_logging")]');
  const existingFunction = jp.query(terraformState, '$..*[?(@.type=="aws_lambda_function" && @.index=="__NEXT_PAGE_LAMBDA_0")]');
  const snsTopics = jp.query(terraformState, '$..*[?(@.type=="aws_sns_topic" && @.name=="this")]');
  const proxyConfigStore = jp.query(terraformState, '$..*[?(@.type=="aws_s3_bucket" && @.name=="proxy_config_store")]');
  const staticDeploy = jp.query(terraformState, '$..*[?(@.type=="aws_s3_bucket" && @.name=="static_upload")]');

  if (lambdaLoggingPolicy.length === 0 || existingFunction.length === 0 || snsTopics.length === 0
    || proxyConfigStore.length === 0 || staticDeploy.length === 0) {
    throw new Error('Please first run `terraform apply` before trying to create deployments via `tf-next create-deployment`.');
  }

  const snsTopic = snsTopics.find((topic: any) => topic.values.arn.includes('tf-next'));

  if (!snsTopic) {
    throw new Error(`Could not find SNS topic created by tf-next.`);
  }

  const topicArn = snsTopic.values.arn.split(':');
  const vpcConfig = existingFunction[0].values.vpc_config;

  // TODO: We'll make these configurable, once we pass the configuration
  //   via environment variables to the deploy-trigger lambda: lambdaTimeout,
  //   deploymentName, defaultRuntime, tags, lambdaRolePermissionsBoundary

  try {
    const config: CreateDeploymentConfiguration = {
      accountId: topicArn[4],
      defaultFunctionMemory: 1024,
      defaultRuntime: 'nodejs14.x',
      deploymentName: 'tf-next',
      lambdaAttachToVpc: false,
      lambdaEnvironmentVariables: existingFunction[0].values.environment[0].variables,
      lambdaLoggingPolicyArn: lambdaLoggingPolicy[0].values.arn,
      lambdaTimeout: 10,
      proxyConfigBucket: proxyConfigStore[0].values.bucket,
      region: topicArn[3],
      staticDeployBucket: staticDeploy[0].values.bucket,
      vpcSecurityGroupIds: [],
      vpcSubnetIds: [],
    };

    if (vpcConfig.length > 0) {
      config.lambdaAttachToVpc = true;
      config.vpcSecurityGroupIds = vpcConfig[0].security_group_ids;
      config.vpcSubnetIds = vpcConfig[0].subnet_ids;
    }

    return config
  } catch(err) {
    throw new Error(`Could not read configuration successfully: ${inspect(err, undefined, 10)}`);
  }
}

async function wait(ms: number): Promise<void> {
  return new Promise((resolve, _) => {
    setTimeout(() => resolve(), ms);
  });
}

async function createIAM(
  deploymentId: string,
  lambdaConfigurations: LambdaConfigurations,
  config: CreateDeploymentConfiguration,
): Promise<RoleArns> {
  const roleArns: RoleArns = {};

  for (const key in lambdaConfigurations) {
    const functionName = `${key}-${deploymentId}`;

    const role = await iam.createRole({
      AssumeRolePolicyDocument: assumeRolePolicy,
      RoleName: functionName,
      Description: 'Managed by Terraform Next.js',
      Tags: [],
    }).promise();
    roleArns[key] = role.Role.Arn;

    const logGroupName = `/aws/lambda/${functionName}`;

    await cloudWatch.createLogGroup({
      logGroupName,
    }).promise();

    await cloudWatch.putRetentionPolicy({
      logGroupName,
      retentionInDays: 14,
    }).promise();

    await iam.attachRolePolicy({
      PolicyArn: config.lambdaLoggingPolicyArn,
      RoleName: functionName,
    }).promise();

    if (config.lambdaAttachToVpc) {
      await iam.attachRolePolicy({
        PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
        RoleName: functionName,
      }).promise();
    }
  }

  // We wait for 6s, because trying to use the roles too quickly after deleting them
  // can lead to an `InvalidParameterValueException` with the message
  // `The role defined for the function cannot be assumed by Lambda.`.
  await wait(6000);

  return roleArns;
}

async function createLambdas(
  deploymentId: string,
  configDir: string,
  lambdaConfigurations: LambdaConfigurations,
  roleArns: RoleArns,
  config: CreateDeploymentConfiguration,
): Promise<LambdaArns> {
  const arns: LambdaArns = {};

  for (const key in lambdaConfigurations) {
    const fileContent = await fs.readFile(path.join(configDir, lambdaConfigurations[key]!.filename));
    const params: Lambda.Types.CreateFunctionRequest = {
      Code: {
        ZipFile: fileContent,
      },
      FunctionName: `${key}-${deploymentId}`,
      Role: roleArns[key]!, // We know this exists because we created it in `createIAM`
      Description: 'Managed by Terraform-next.js',
      Environment: {
        Variables: config.lambdaEnvironmentVariables,
      },
      Handler: lambdaConfigurations[key]?.handler || '',
      MemorySize: lambdaConfigurations[key]?.memory || config.defaultFunctionMemory,
      PackageType: 'Zip', // Default in TF
      Publish: false, // Default in TF
      Runtime: lambdaConfigurations[key]?.runtime || config.defaultRuntime,
      Tags: {},
      Timeout: config.lambdaTimeout,
      VpcConfig: {},
    };
    if (config.lambdaAttachToVpc) {
      params.VpcConfig!.SecurityGroupIds = config.vpcSecurityGroupIds;
      params.VpcConfig!.SubnetIds = config.vpcSubnetIds;
    }
    const createdLambda = await lambda.createFunction(params).promise();

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
  lambdaConfigurations: LambdaConfigurations,
  lambdaArns: LambdaArns,
  config: CreateDeploymentConfiguration,
): Promise<{ apiId: string, executeArn: string }> {
  const api = await apiGatewayV2.createApi({
    Name: `${config.deploymentName} - ${deploymentId}`,
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
  }).promise();

  for (const key in lambdaConfigurations) {
    const integration = await apiGatewayV2.createIntegration({
      ApiId: api.ApiId,
      IntegrationType: 'AWS_PROXY',
      Description: 'Managed by Terraform-next.js',
      IntegrationMethod: 'POST',
      IntegrationUri: lambdaArns[key],
      PayloadFormatVersion: '2.0',
      TimeoutInMillis: config.lambdaTimeout * 1000,
    }).promise();

    await apiGatewayV2.createRoute({
      ApiId: api.ApiId,
      RouteKey: `ANY ${lambdaConfigurations[key]?.route}/{proxy+}`,
      AuthorizationType: 'NONE',
      Target: `integrations/${integration.IntegrationId}`,
    }).promise();
  }

  // The ARN prefix to be used in an aws_lambda_permission's source_arn attribute or in an aws_iam_policy to authorize access to the @connections API.
  return {
    apiId: api.ApiId,
    executeArn: `arn:aws:execute-api:${config.region}:${config.accountId}:${api.ApiId}`,
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
  staticFilesArchive,
  terraformState,
  target = 'AWS',
}: CreateDeploymentProps) {
  const config = await readConfig(terraformState);

  const configDir = path.join(cwd, '.next-tf');
  const configFile = require(path.join(configDir, 'config.json'));
  const lambdaConfigurations = configFile.lambdas;

  // Create IAM & CW resources
  const roleArns = await createIAM(
    deploymentId,
    lambdaConfigurations,
    config,
  );

  log(deploymentId, 'created log groups and roles.', logLevel);

  // Create lambdas
  const lambdaArns = await createLambdas(
    deploymentId,
    configDir,
    lambdaConfigurations,
    roleArns,
    config,
  );

  log(deploymentId, 'created lambda functions.', logLevel);

  // Create API Gateway
  const { apiId, executeArn } = await createAPIGateway(
    deploymentId,
    lambdaConfigurations,
    lambdaArns,
    config,
  );

  log(deploymentId, 'created API gateway.', logLevel);

  // Create lambda permissions
  await createLambdaPermissions(
    deploymentId,
    lambdaConfigurations,
    executeArn,
  );

  log(deploymentId, 'created lambda permissions.', logLevel);

  // Modify proxy config to include API Gateway id and match expected format
  const lambdaRoutes = [];
  for (const key in lambdaConfigurations) {
    lambdaRoutes.push(lambdaConfigurations[key].route || '/');
  }

  const modifiedProxyConfig = {
    apiId,
    routes: configFile.routes,
    prerenders: configFile.prerenders,
    staticRoutes: configFile.staticRoutes,
    lambdaRoutes,
  };

  // Upload proxy config to bucket
  await s3.putObject({
    Body: JSON.stringify(modifiedProxyConfig),
    Bucket: config.proxyConfigBucket,
    ContentType: 'application/json',
    Key: `${deploymentId}/proxy-config.json`,
  }).promise();

  log(deploymentId, 'created proxy config.', logLevel);

  // Upload static assets
  await s3.putObject({
    Body: (await fs.readFile(path.join(cwd, '.next-tf', staticFilesArchive))),
    Bucket: config.staticDeployBucket,
    Key: staticFilesArchive,
  }).promise();

  log(deploymentId, 'uploaded static assets.', logLevel);

  // Image optimizer stuff
}

export default createDeploymentCommand;
