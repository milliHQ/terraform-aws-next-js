module "proxy_package" {
  source  = "milliHQ/download/npm"
  version = "2.0.0"

  module_name    = "@dealmore/terraform-next-proxy"
  module_version = var.proxy_module_version
  path_to_file   = "dist.zip"
  use_local      = var.debug_use_local_packages
  local_cwd      = var.tf_next_module_root
}

#############
# Lambda@Edge
#############

resource "random_id" "function_name" {
  prefix      = "next-tf-proxy-"
  byte_length = 4
}

data "aws_iam_policy_document" "dynamo_access" {
  count = var.multiple_deployments ? 1 : 0
  statement {
    actions   = ["dynamodb:GetItem"]
    resources = [var.proxy_config_table_arn]
  }
}

module "edge_proxy" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "2.4.0"

  lambda_at_edge = true

  function_name             = random_id.function_name.hex
  description               = "Managed by Terraform Next.js"
  handler                   = "handler.handler"
  runtime                   = var.lambda_default_runtime
  role_permissions_boundary = var.lambda_role_permissions_boundary
  policy_json               = var.multiple_deployments ? data.aws_iam_policy_document.dynamo_access[0].json : null
  attach_policy_json        = var.multiple_deployments

  create_package         = false
  local_existing_package = module.proxy_package.abs_path

  cloudwatch_logs_retention_in_days = 30

  tags = var.tags

  providers = {
    aws = aws.global_region
  }
}
