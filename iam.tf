######################
# IAM Role (λ Next.js)
######################

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
  for_each = local.lambdas

  name        = "${var.deployment_name}_${each.key}"
  description = "Managed by Terraform Next.js"

  permissions_boundary = var.lambda_role_permissions_boundary

  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = var.tags
}

#############################
# Cloudwatch Logs (λ Next.js)
#############################

resource "aws_cloudwatch_log_group" "this" {
  for_each = local.lambdas

  name              = "/aws/lambda/${var.deployment_name}_${each.key}"
  retention_in_days = 14

  tags = var.tags
}

data "aws_iam_policy_document" "lambda_logging" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = [
      "arn:aws:logs:*:*:*"
    ]
  }
}

resource "aws_iam_policy" "lambda_logging" {
  description = "Managed by Terraform Next.js"

  policy = data.aws_iam_policy_document.lambda_logging.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  for_each = local.lambdas

  role       = aws_iam_role.lambda[each.key].name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  for_each = var.lambda_attach_to_vpc ? local.lambdas : {}

  role       = aws_iam_role.lambda[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}


####################################
# Additional policy JSON (λ Next.js)
####################################

resource "aws_iam_policy" "additional_json" {
  count = var.lambda_attach_policy_json ? 1 : 0

  description = "Managed by Terraform Next.js"
  policy      = var.lambda_policy_json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "additional_json" {
  for_each = var.lambda_attach_policy_json ? local.lambdas : {}

  role       = aws_iam_role.lambda[each.key].name
  policy_arn = aws_iam_policy.additional_json[0].arn
}
