terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

# Main region where the resources should be created in
provider "aws" {
  region = "us-east-1"
}

module "tf_next" {
  source = "dealmore/next-js/aws"

  next_tf_dir     = var.next_tf_dir
  deployment_name = var.deployment_name

  # Uncomment when using in the cloned monorepo for tf-next development
  # source = "../../.."
  # debug_use_local_packages = true
}

