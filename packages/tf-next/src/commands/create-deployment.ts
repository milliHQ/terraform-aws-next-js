import { ApiGatewayV2, CloudWatchLogs, IAM, Lambda } from 'aws-sdk';
import { promises } from 'fs';
import { query } from 'jsonpath';
import * as path from 'path';
import { inspect } from 'util';

const apiGatewayV2 = new ApiGatewayV2();
const cloudWatch = new CloudWatchLogs();
const iam = new IAM();
const lambda = new Lambda();

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
) {
  const integrationKeys = [];
  const integrationValues = [];

  for (const key in lambdaConfigurations) {
    integrationKeys.push(`ANY ${lambdaConfigurations[key].route}/{proxy+}`)
    integrationValues.push({
      lambda_arn:             lambdaArns[key],
      payload_format_version: '2.0',
      timeout_milliseconds:   lambdaTimeout * 1000,
    });
  }

  await apiGatewayV2.createApi({
    Name: `${deploymentName} - ${deploymentId}`,
    ProtocolType: 'HTTP',
    ApiKeySelectionExpression: '$request.header.x-api-key',
    Description: 'Managed by Terraform-next.js',
    RouteSelectionExpression: '$request.method $request.path',
    Tags: {},
  }).promise();

  // resource "aws_apigatewayv2_stage" "default" {
  //   count = var.create && var.create_default_stage ? 1 : 0

  //   api_id      = aws_apigatewayv2_api.this[0].id
  //   name        = "$default"
  //   auto_deploy = true

  //   dynamic "access_log_settings" {
  //     for_each = var.default_stage_access_log_destination_arn != null && var.default_stage_access_log_format != null ? [true] : []
  //     content {
  //       destination_arn = var.default_stage_access_log_destination_arn
  //       format          = var.default_stage_access_log_format
  //     }
  //   }

  //   dynamic "default_route_settings" {
  //     for_each = length(keys(var.default_route_settings)) == 0 ? [] : [var.default_route_settings]
  //     content {
  //       data_trace_enabled       = lookup(default_route_settings.value, "data_trace_enabled", false)
  //       detailed_metrics_enabled = lookup(default_route_settings.value, "detailed_metrics_enabled", false)
  //       logging_level            = lookup(default_route_settings.value, "logging_level", null)
  //       throttling_burst_limit   = lookup(default_route_settings.value, "throttling_burst_limit", null)
  //       throttling_rate_limit    = lookup(default_route_settings.value, "throttling_rate_limit", null)
  //     }
  //   }

  //   #  # bug - https://github.com/terraform-providers/terraform-provider-aws/issues/12893
  //   #  dynamic "route_settings" {
  //   #    for_each = var.create_routes_and_integrations ? var.integrations : {}
  //   #    content {
  //   #      route_key = route_settings.key
  //   #      data_trace_enabled = lookup(route_settings.value, "data_trace_enabled", null)
  //   #      detailed_metrics_enabled         = lookup(route_settings.value, "detailed_metrics_enabled", null)
  //   #      logging_level         = lookup(route_settings.value, "logging_level", null)  # Error: error updating API Gateway v2 stage ($default): BadRequestException: Execution logs are not supported on protocolType HTTP
  //   #      throttling_burst_limit         = lookup(route_settings.value, "throttling_burst_limit", null)
  //   #      throttling_rate_limit         = lookup(route_settings.value, "throttling_rate_limit", null)
  //   #    }
  //   #  }

  //   tags = merge(var.default_stage_tags, var.tags)

  //   # Bug in terraform-aws-provider with perpetual diff
  //   lifecycle {
  //     ignore_changes = [deployment_id]
  //   }
  // }

  // resource "aws_apigatewayv2_route" "this" {
  //   for_each = var.create && var.create_routes_and_integrations ? var.integrations : {}

  //   api_id    = aws_apigatewayv2_api.this[0].id
  //   route_key = each.key

  //   api_key_required                    = lookup(each.value, "api_key_required", null)
  //   authorization_type                  = lookup(each.value, "authorization_type", "NONE")
  //   authorizer_id                       = lookup(each.value, "authorizer_id", null)
  //   model_selection_expression          = lookup(each.value, "model_selection_expression", null)
  //   operation_name                      = lookup(each.value, "operation_name", null)
  //   route_response_selection_expression = lookup(each.value, "route_response_selection_expression", null)
  //   target                              = "integrations/${aws_apigatewayv2_integration.this[each.key].id}"

  //   # Not sure what structure is allowed for these arguments...
  //   #  authorization_scopes = lookup(each.value, "authorization_scopes", null)
  //   #  request_models  = lookup(each.value, "request_models", null)
  // }

  // resource "aws_apigatewayv2_integration" "this" {
  //   for_each = var.create && var.create_routes_and_integrations ? var.integrations : {}

  //   api_id      = aws_apigatewayv2_api.this[0].id
  //   description = lookup(each.value, "description", null)

  //   integration_type    = lookup(each.value, "integration_type", lookup(each.value, "lambda_arn", "") != "" ? "AWS_PROXY" : "MOCK")
  //   integration_subtype = lookup(each.value, "integration_subtype", null)
  //   integration_method  = lookup(each.value, "integration_method", lookup(each.value, "integration_subtype", null) == null ? "POST" : null)
  //   integration_uri     = lookup(each.value, "lambda_arn", lookup(each.value, "integration_uri", null))

  //   connection_type = lookup(each.value, "connection_type", "INTERNET")
  //   connection_id   = try(aws_apigatewayv2_vpc_link.this[each.value["vpc_link"]].id, lookup(each.value, "connection_id", null))

  //   payload_format_version    = lookup(each.value, "payload_format_version", null)
  //   timeout_milliseconds      = lookup(each.value, "timeout_milliseconds", null)
  //   passthrough_behavior      = lookup(each.value, "passthrough_behavior", null)
  //   content_handling_strategy = lookup(each.value, "content_handling_strategy", null)
  //   credentials_arn           = lookup(each.value, "credentials_arn", null)
  //   request_parameters        = try(jsondecode(each.value["request_parameters"]), each.value["request_parameters"], null)

  //   dynamic "tls_config" {
  //     for_each = flatten([try(jsondecode(each.value["tls_config"]), each.value["tls_config"], [])])
  //     content {
  //       server_name_to_verify = tls_config.value["server_name_to_verify"]
  //     }
  //   }
  // }

  // # VPC Link (Private API)
  // resource "aws_apigatewayv2_vpc_link" "this" {
  //   for_each = var.create && var.create_vpc_link ? var.vpc_links : {}

  //   name               = lookup(each.value, "name", each.key)
  //   security_group_ids = each.value["security_group_ids"]
  //   subnet_ids         = each.value["subnet_ids"]

  //   tags = merge(var.tags, var.vpc_link_tags, lookup(each.value, "tags", {}))
  // }

  // TODO: create integrations
}

async function createLambdaPermissions() {
  // resource "aws_lambda_permission" "current_version_triggers" {
  //   for_each = local.lambdas

  //   statement_id  = "AllowInvokeFromApiGateway"
  //   action        = "lambda:InvokeFunction"
  //   function_name = random_id.function_name[each.key].hex
  //   principal     = "apigateway.amazonaws.com"

  //   source_arn = "${module.api_gateway.apigatewayv2_api_execution_arn}/*/*/*"
  // }
}

function log(deploymentId: string, message: string, logLevel: LogLevel) {
  if (logLevel === 'verbose') {
    console.log(`Deployment ${deploymentId}: created log groups and roles.`);
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

  // Create log groups
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
  await createAPIGateway(
    deploymentId,
    deploymentName,
    lambdaTimeout,
    lambdaConfigurations,
    lambdaArns,
  );

  log(deploymentId, 'created API gateway.', logLevel);

  // Create lambda permissions
  await createLambdaPermissions();

  log(deploymentId, 'created lambda permissions.', logLevel);

  // Image optimizer stuff
  // Modify proxy config to include API Gateway id
  // Upload proxy config to bucket
  // Upload static assets
}

export default createDeploymentCommand;
