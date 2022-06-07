########
# Lambda
########

# For changing records in deployment & alias tables
data "aws_iam_policy_document" "access_dynamodb_tables" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:DeleteItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem"
    ]
    resources = [
      var.dynamodb_table_deployments_arn,
      "${var.dynamodb_table_deployments_arn}/index/*",
      var.dynamodb_table_aliases_arn,
      "${var.dynamodb_table_aliases_arn}/index/*",
    ]
  }
}

# For creating the presigned upload URL in S3
data "aws_iam_policy_document" "access_upload_bucket" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject"
    ]
    resources = [
      "${var.upload_bucket_arn}/*"
    ]
  }
}

# Initiate deletion of CloudFormation stacks
data "aws_iam_policy_document" "delete_cloudformation_stack" {
  statement {
    effect = "Allow"
    actions = [
      "cloudformation:DeleteStack"
    ]
    resources = [
      "arn:aws:cloudformation:*:*:stack/*/*"
    ]
  }
}

module "lambda" {
  source = "../lambda-worker"

  module_name       = "@millihq/terraform-next-api"
  module_version    = var.api_component_version
  module_asset_path = "dist.zip"
  local_cwd         = var.tf_next_module_root

  function_name = "${var.deployment_name}_tfn-api"
  description   = "Managed by Terraform Next.js"
  handler       = "handler.handler"
  memory_size   = 128

  attach_policy_jsons    = true
  number_of_policy_jsons = 3
  policy_jsons = [
    data.aws_iam_policy_document.access_dynamodb_tables.json,
    data.aws_iam_policy_document.access_upload_bucket.json,
    data.aws_iam_policy_document.delete_cloudformation_stack.json,
  ]

  environment_variables = {
    NODE_ENV               = "production"
    TABLE_REGION           = var.dynamodb_region
    TABLE_NAME_DEPLOYMENTS = var.dynamodb_table_deployments_name
    TABLE_NAME_ALIASES     = var.dynamodb_table_aliases_name
    UPLOAD_BUCKET_ID       = var.upload_bucket_id
    UPLOAD_BUCKET_REGION   = var.upload_bucket_region
  }

  allowed_triggers = {
    InvokeFromAPIGateway = {
      principal  = "apigateway.amazonaws.com"
      source_arn = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
    }
  }

  tags = var.tags

  debug_use_local_packages = var.debug_use_local_packages
}

#############
# API Gateway
#############

resource "aws_apigatewayv2_api" "api" {
  name          = "${var.deployment_name}_api"
  protocol_type = "HTTP"

  tags = var.tags
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"

  connection_type        = "INTERNET"
  payload_format_version = "2.0"
  integration_uri        = module.lambda.lambda_function_invoke_arn
}

resource "aws_apigatewayv2_route" "lambda_integration" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "ANY /{proxy+}"
  authorization_type = "AWS_IAM"

  target = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  tags = var.tags
}

###################################
# Invoke Permission for API Gateway
###################################

data "aws_iam_policy_document" "access_api" {
  statement {
    effect = "Allow"
    actions = [
      "execute-api:Invoke",
    ]
    resources = [
      "${aws_apigatewayv2_api.api.execution_arn}/*/*"
    ]
  }
}

resource "aws_iam_policy" "access_api" {
  name = "${var.deployment_name}_api-access"

  description = "Managed by Terraform Next.js"

  policy = data.aws_iam_policy_document.access_api.json

  tags = var.tags
}
