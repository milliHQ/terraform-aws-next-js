
provider "aws" {
  version = "~> 2.0"
  region  = var.aws_region
}

provider "aws" {
  alias  = "virginia"
  region = "us-east-1"
}

module "lambdas" {
  source = "../../.."

  next_tf_dir              = var.next_tf_dir
  debug_use_local_packages = true
  deployment_name          = var.deployment_name

  providers = {
    aws.global = aws.virginia
  }
}

