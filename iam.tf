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

  name        = random_id.function_name[each.key].hex
  description = "Managed by Terraform Next.js"

  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

#############################
# Cloudwatch Logs (λ Next.js)
#############################

resource "aws_cloudwatch_log_group" "this" {
  for_each = local.lambdas

  name              = "/aws/lambda/${random_id.function_name[each.key].hex}"
  retention_in_days = 14
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
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  for_each = local.lambdas

  role       = random_id.function_name[each.key].hex
  policy_arn = aws_iam_policy.lambda_logging.arn

  depends_on = [aws_iam_role.lambda]
}
