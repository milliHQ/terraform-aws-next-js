locals {
  config_dir  = trimsuffix(var.next_tf_dir, "/")
  config_file = jsondecode(file("${local.config_dir}/config.json"))
  lambdas     = lookup(local.config_file, "lambdas", [])
}

##########
# IAM role
##########

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

  name        = each.key
  description = "Managed by Terraform-next.js"

  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_lambda_function" "this" {
  for_each = local.lambdas

  function_name = each.key
  description   = "Managed by Terraform-next.js"
  role          = aws_iam_role.lambda[each.key].arn
  handler       = lookup(each.value, "handler", "")
  runtime       = lookup(each.value, "runtime", "nodejs12.x")
  memory_size   = lookup(each.value, "memory:", 1024)

  filename = "${local.config_dir}/${lookup(each.value, "filename", "")}"
}
