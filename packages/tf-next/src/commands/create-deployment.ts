import { ApiGatewayV2 } from 'aws-sdk';
import * as path from 'path';

const apiGatewayV2 = new ApiGatewayV2()

interface CreateDeploymentProps {
  id: string;
  logLevel?: 'verbose' | 'none';
  cwd: string;
  target?: 'AWS';
}

interface LambdaConfiguration {
  handler: string;
  runtime: string;
  filename: string;
  route: string;
}

async function createDeploymentCommand({
  id,
  logLevel,
  cwd,
  target = 'AWS',
}: CreateDeploymentProps) {
  // TODO:
  //    make lambdaTimeout configurable
  //    make deploymentName configurable
  //    allow tags to be passed through

  const lambdaTimeout = 10;
  const deploymentName = 'tf-next';

  const configFilePath = path.join(cwd, '.next-tf', 'config.json');
  const configFile = require(configFilePath);
  const lambdas = configFile.lambdas;

  const integrationKeys = lambdas.values().map((value: LambdaConfiguration) => {
    return `ANY ${value.route}/{proxy+}`;
  });
  const integrationValues = lambdas.keys().map((key: string) => ({
    lambda_arn:             'abc', // aws_lambda_function.this[integration_key].arn,
    payload_format_version: '2.0',
    timeout_milliseconds:   lambdaTimeout * 1000,
  }));

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

  // Create lambdas
  // Create API Gateway

  await apiGatewayV2.createApi({
    Name: `${deploymentName} - ${id}`,
    ProtocolType: 'HTTP',
    ApiKeySelectionExpression: '$request.header.x-api-key',
    Description: 'Managed by Terraform-next.js',
    RouteSelectionExpression: '$request.method $request.path',
    Tags: {},
  }).promise();

  // Modify proxy config to include API Gateway id
  // Upload proxy config to bucket
  // Upload static assets
}

export default createDeploymentCommand;
