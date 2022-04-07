module "proxy_package" {
  source  = "milliHQ/download/npm"
  version = "2.1.0"

  module_name    = "@millihq/terraform-next-proxy"
  module_version = var.proxy_module_version
  path_to_file   = "dist.zip"
  use_local      = var.debug_use_local_packages
  local_cwd      = var.tf_next_module_root
}

#############
# Lambda@Edge
#############

module "edge_proxy" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "3.1.0"

  lambda_at_edge = true

  function_name             = "${var.deployment_name}_tfn-proxy"
  description               = "Managed by Terraform Next.js"
  handler                   = "handler.handler"
  runtime                   = var.lambda_default_runtime
  role_permissions_boundary = var.lambda_role_permissions_boundary

  create_package         = false
  local_existing_package = module.proxy_package.rel_path

  cloudwatch_logs_retention_in_days = 30

  tags = var.tags

  providers = {
    aws = aws.global_region
  }
}
