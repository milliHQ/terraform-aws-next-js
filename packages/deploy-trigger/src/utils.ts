import { pseudoRandomBytes } from 'crypto';
import { inspect } from 'util';
import unzipper from 'unzipper';
import { DeploymentConfiguration, Lambdas, VpcConfig } from './types';

export function generateRandomId(length: number) {
  return pseudoRandomBytes(length).toString('hex');
}

export function generateRandomBuildId() {
  return generateRandomId(16);
}

export async function readConfigFile(
  files: unzipper.File[],
  key: string,
): Promise<any> {
  const configFile = files.find((file) => file.path === 'config.json');
  if (!configFile) {
    throw new Error(`Did not find config.json in deployment file: ${key}`);
  }

  try {
    const configFileContent = await configFile.buffer();
    return JSON.parse(configFileContent.toString());
  } catch (err) {
    console.error(`Could not parse config.json: ${inspect(err)}`);
    throw err;
  }
}

export async function readLambdas(files: unzipper.File[]): Promise<Lambdas> {
  const lambdas: Lambdas = {};

  for (const file of files) {
    if (file.path.startsWith('lambdas/')) {
      lambdas[file.path] = await file.buffer();
    }
  }

  return lambdas;
}

function readVpcConfig(): VpcConfig {
  const attachToVpc = !!process.env.ATTACH_TO_VPC;
  let vpcSecurityGroupIds = process.env.VPC_SECURITY_GROUP_IDS || '[]';
  let vpcSubnetIds = process.env.VPC_SUBNET_IDS || '[]';

  try {
    return {
      attachToVpc,
      vpcSecurityGroupIds: JSON.parse(vpcSecurityGroupIds),
      vpcSubnetIds: JSON.parse(vpcSubnetIds),
    };
  } catch (err) {
    throw new Error(`Could not parse some of the VPC environment variables: ${inspect(err)}`);
  }
}

function readLambdaEnvironmentVariables(): {[key: string]: string} {
  const lambdaEnvironmentVariables = process.env.LAMBDA_ENVIRONMENT_VARIABLES || '{}';

  try {
    return JSON.parse(lambdaEnvironmentVariables);
  } catch (err) {
    throw new Error(`Could not parse lambda environment variables: ${inspect(err)}`);
  }
}

export function readEnvConfig(): DeploymentConfiguration {
  const accountId = process.env.ACCOUNT_ID;
  const lambdaEnvironmentVariables = readLambdaEnvironmentVariables();
  const lambdaLoggingPolicyArn = process.env.LAMBDA_LOGGING_POLICY_ARN;
  const proxyConfigBucket = process.env.PROXY_CONFIG_BUCKET;
  const proxyConfigTable = process.env.PROXY_CONFIG_TABLE;
  const region = process.env.REGION;
  const staticDeployBucket = process.env.TARGET_BUCKET;
  const vpcConfig = readVpcConfig();

  if (!accountId || !proxyConfigTable || !proxyConfigBucket ||
    !region || !lambdaLoggingPolicyArn) {
    throw new Error(
      'The environment variables do not contain all necessary information to create a deployment'
    );
  }

  return {
    accountId,
    defaultFunctionMemory: 1024,
    defaultRuntime: 'nodejs14.x',
    deploymentName: 'tf-next',
    lambdaAttachToVpc: vpcConfig.attachToVpc,
    lambdaEnvironmentVariables,
    lambdaLoggingPolicyArn,
    lambdaTimeout: 10,
    proxyConfigBucket,
    proxyConfigTable,
    region,
    staticDeployBucket,
    vpcSecurityGroupIds: vpcConfig.vpcSecurityGroupIds,
    vpcSubnetIds: vpcConfig.vpcSubnetIds,
  };
}
