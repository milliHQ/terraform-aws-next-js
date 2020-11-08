provider "aws" {
  version = "~> 3.0"
  region  = var.aws_region
}

module "tf_next" {
  source = "../../.."

  next_tf_dir              = var.next_tf_dir
  debug_use_local_packages = true
  deployment_name          = var.deployment_name
}

