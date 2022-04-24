locals {
  function_name = "${var.deployment_name}_tfn-controller"
  role_name     = local.function_name
}

###########
# SNS-Topic
###########

resource "aws_sns_topic" "cloudformation_updates" {
  name_prefix = var.deployment_name

  tags = var.tags
}

resource "aws_sns_topic_subscription" "lambda" {
  topic_arn = aws_sns_topic.cloudformation_updates.arn
  protocol  = "lambda"
  endpoint  = module.worker.lambda_function_arn
}

########
# Worker
########

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

  allowed_triggers = {
    CloudFormationUpdates = {
      principal  = "sns.amazonaws.com"
      source_arn = aws_sns_topic.cloudformation_updates.arn
    }
  }

  tags = var.tags

  debug_use_local_packages = var.debug_use_local_packages
}
