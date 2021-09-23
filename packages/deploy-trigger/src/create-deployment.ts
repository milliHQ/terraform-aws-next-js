import { ApiGatewayV2, CloudWatchLogs, DynamoDB, IAM, Lambda, S3 } from 'aws-sdk';
import { inspect } from 'util';
import { DeploymentConfiguration, Lambdas, ProxyConfig } from './types';
import { runWithDelay } from './utils'

// TODO: Have a central configuration for AWS API versions

const apiGatewayV2 = new ApiGatewayV2();
const cloudWatch = new CloudWatchLogs();
const dynamoDB = new DynamoDB();
const iam = new IAM();
const lambda = new Lambda();
const s3 = new S3();

interface CreateDeploymentProps {
  deploymentId: string;
  lambdas: Lambdas;
  config: DeploymentConfiguration;
  configFile: any;
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
  config: DeploymentConfiguration,
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

  return roleArns;
}

async function createLambdas(
  deploymentId: string,
  lambdas: Lambdas,
  lambdaConfigurations: LambdaConfigurations,
  roleArns: RoleArns,
  config: DeploymentConfiguration,
): Promise<LambdaArns> {
  const arns: LambdaArns = {};

  console.log('createLambdas', Object.keys(lambdaConfigurations), lambdas);

  for (const key in lambdaConfigurations) {
    // TODO: An alternative approach would be to upload the lambdas as separate zip files
    //       and then upload the `config.json`, which would trigger the deployment creation.
    //       Then we could use `Code: {S3Bucket, S3Key}` here instead of having to read the
    //       lambda code explicitly.
    //
    const lambdaKey = Object.keys(lambdas).find((k) => k.includes(key));

    if (!lambdaKey) {
      throw new Error(`Could not find code for ${key} in ${inspect(lambdas)}`);
    }

    const fileContent = lambdas[lambdaKey];
    const params: Lambda.Types.CreateFunctionRequest = {
      Code: {
        ZipFile: fileContent,
      },
      FunctionName: `${key}-${deploymentId}`,
      Role: roleArns[key]!, // We know this exists, because we created it in `createIAM`
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
  config: DeploymentConfiguration,
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

async function uploadProxyConfig(
  deploymentId: string,
  config: ProxyConfig,
  bucket: string,
  table: string,
  tag?: string,
) {
  const configString = JSON.stringify(config);

  await s3.putObject({
    Body: configString,
    Bucket: bucket,
    ContentType: 'application/json',
    Key: `${deploymentId}/proxy-config.json`,
  }).promise();

  await dynamoDB.putItem({
    TableName: table,
    Item: {
      alias: {
        S: deploymentId,
      },
      proxyConfig: {
        S: configString,
      },
      tag: {
        S: tag,
      },
      createdAt: {
        S: new Date().toISOString(),
      }
    },
  }).promise();
}

function log(deploymentId: string, message: string) {
  console.log(`Deployment ${deploymentId}: ${message}`);
}

async function createDeployment({
  deploymentId,
  lambdas,
  config,
  configFile,
}: CreateDeploymentProps) {
  const lambdaConfigurations = configFile.lambdas;

  log(deploymentId, 'starting to create deployment.');

  // Create IAM & CW resources
  const roleArns = await createIAM(
    deploymentId,
    lambdaConfigurations,
    config,
  );

  log(deploymentId, 'created log groups and roles.');

  // Create lambdas
  // We need some delay and retry, because trying to use the roleArns too quickly after deleting them
  // can lead to an `InvalidParameterValueException` with the message
  // `The role defined for the function cannot be assumed by Lambda`.
  const needRetry = (e: any) => e.code === 'InvalidParameterValueException';
  const runCreateLambda = async () => await createLambdas(
    deploymentId,
    lambdas,
    lambdaConfigurations,
    roleArns,
    config,
  );
  const lambdaArns = await runWithDelay(runCreateLambda, needRetry)

  log(deploymentId, 'created lambda functions.');

  // Create API Gateway
  const { apiId, executeArn } = await createAPIGateway(
    deploymentId,
    lambdaConfigurations,
    lambdaArns,
    config,
  );

  log(deploymentId, 'created API gateway.');

  // Create lambda permissions
  await createLambdaPermissions(
    deploymentId,
    lambdaConfigurations,
    executeArn,
  );

  log(deploymentId, 'created lambda permissions.');

  // Modify proxy config to include API Gateway id and match expected format
  const lambdaRoutes = [];
  for (const key in lambdaConfigurations) {
    lambdaRoutes.push(lambdaConfigurations[key].route || '/');
  }

  const modifiedProxyConfig: ProxyConfig = {
    apiId,
    routes: configFile.routes,
    prerenders: configFile.prerenders,
    staticRoutes: configFile.staticRoutes,
    lambdaRoutes,
  };

  // Upload proxy config to bucket and table
  await uploadProxyConfig(
    deploymentId,
    modifiedProxyConfig,
    config.proxyConfigBucket,
    config.proxyConfigTable,
    configFile.tag,
  );

  log(deploymentId, 'created proxy config.');
}

export default createDeployment;
