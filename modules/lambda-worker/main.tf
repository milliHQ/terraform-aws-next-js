# This module is based on the terraform-aws-lambda module:
# https://github.com/terraform-aws-modules/terraform-aws-lambda
#
# See the LICENSE file in the directory of this module for more information.
#
# It simplifies the available options for configuration to match the needs of
# this project.

locals {
  role_name = var.function_name
}

###############
# Lambda Source
###############

module "lambda_content" {
  source  = "milliHQ/download/npm"
  version = "2.1.0"

  module_name    = var.module_name
  module_version = var.module_version
  path_to_file   = "dist.zip"
  use_local      = var.debug_use_local_packages
  local_cwd      = var.local_cwd
}

###########
# Log Group
###########

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.cloudwatch_logs_retention_in_days

  tags = var.tags
}

##########
# Function
##########

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  description   = var.description
  handler       = var.handler
  runtime       = var.runtime
  memory_size   = var.memory_size
  timeout       = var.timeout
  role          = aws_iam_role.lambda.arn

  filename         = module.lambda_content.rel_path
  source_code_hash = filebase64sha256(module.lambda_content.rel_path)

  dynamic "environment" {
    for_each = length(keys(var.environment_variables)) == 0 ? [] : [true]
    content {
      variables = var.environment_variables
    }
  }

  tags = var.tags

  # Wait until the creation of the log group is finished before the lambda is
  # deployed.
  depends_on = [aws_cloudwatch_log_group.lambda]
}

resource "aws_lambda_permission" "triggers" {
  for_each = var.allowed_triggers

  function_name = aws_lambda_function.this.function_name

  statement_id       = try(each.value.statement_id, each.key)
  action             = try(each.value.action, "lambda:InvokeFunction")
  principal          = try(each.value.principal, format("%s.amazonaws.com", try(each.value.service, "")))
  source_arn         = try(each.value.source_arn, null)
  source_account     = try(each.value.source_account, null)
  event_source_token = try(each.value.event_source_token, null)
}

####################################
# Additional policies (list of JSON)
####################################

resource "aws_iam_policy" "additional_jsons" {
  count = var.attach_policy_jsons ? var.number_of_policy_jsons : 0

  name   = "${local.role_name}-${count.index}"
  policy = var.policy_jsons[count.index]

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "additional_jsons" {
  count = var.attach_policy_jsons ? var.number_of_policy_jsons : 0

  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.additional_jsons[count.index].arn
}
