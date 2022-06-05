locals {
  function_name = "${var.deployment_name}_tfn-controller"
}

###########
# SNS-Topic
###########

resource "aws_sns_topic" "cloudformation_updates" {
  name_prefix = var.deployment_name

  tags = var.tags
}

# CloudFormation sends events for each status change of each resource in the
# stack, including the stack itself.
# Unfortunately the payload of the stack events is always delivered as a single
# SNS message instead of using messageAttributes, so no filtering for updates
# that only affect the stack is possible.
# See: https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/635
resource "aws_sns_topic_subscription" "lambda" {
  topic_arn = aws_sns_topic.cloudformation_updates.arn
  protocol  = "lambda"
  endpoint  = module.worker.lambda_function_arn
}

#############
# Permissions
#############

# Access the dynamodb tables
data "aws_iam_policy_document" "access_dynamodb_tables" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem"
    ]
    resources = [
      var.dynamodb_table_deployments_arn,
      var.dynamodb_table_aliases_arn
    ]
  }
}

# Read the output from the created CloudFormation stacks
data "aws_iam_policy_document" "access_cloudformation_stacks" {
  statement {
    effect = "Allow"
    actions = [
      "cloudformation:DescribeStacks",
    ]
    resources = [
      "*"
    ]
  }
}

###############
# Worker Lambda
###############

module "worker" {
  source = "../lambda-worker"

  module_name       = "@millihq/terraform-next-deploy-controller"
  module_version    = var.deploy_controller_component_version
  module_asset_path = "dist.zip"
  local_cwd         = var.tf_next_module_root

  function_name = "${var.deployment_name}_tfn-controller"
  description   = "Managed by Terraform Next.js"
  handler       = "handler.handler"
  memory_size   = 128

  attach_policy_jsons    = true
  number_of_policy_jsons = 2
  policy_jsons = [
    data.aws_iam_policy_document.access_dynamodb_tables.json,
    data.aws_iam_policy_document.access_cloudformation_stacks.json,
  ]

  environment_variables = {
    NODE_ENV               = "production"
    TABLE_REGION           = var.dynamodb_region
    TABLE_NAME_DEPLOYMENTS = var.dynamodb_table_deployments_name
    TABLE_NAME_ALIASES     = var.dynamodb_table_aliases_name
    # Remove the * from the base domain (e.g. *.example.com -> .example.com)
    MULTI_DEPLOYMENTS_BASE_DOMAIN = var.enable_multiple_deployments ? replace(var.multiple_deployments_base_domain, "/^\\*/", "") : null
  }

  allowed_triggers = {
    CloudFormationUpdates = {
      principal  = "sns.amazonaws.com"
      source_arn = aws_sns_topic.cloudformation_updates.arn
    }
  }

  tags = var.tags

  debug_use_local_packages = var.debug_use_local_packages
}
