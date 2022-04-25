# This module is based on the terraform-aws-lambda module:
# https://github.com/terraform-aws-modules/terraform-aws-lambda
#
# See the LICENSE file in the directory of this module for more information.
#
# It simplifies the available options for configuration to match the needs of
# this project.

#############
# Lambda Role
#############

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = var.function_name
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = var.tags
}

#################
# Cloudwatch Logs
#################

data "aws_iam_policy_document" "logs" {
  statement {
    effect    = "Allow"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = flatten([for _, v in ["%v:*", "%v:*:*"] : format(v, aws_cloudwatch_log_group.lambda.arn)])
  }
}

resource "aws_iam_policy" "logs" {
  name   = "${local.role_name}-logs"
  policy = data.aws_iam_policy_document.logs.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.logs.arn
}
