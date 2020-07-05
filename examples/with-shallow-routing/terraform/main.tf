
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

  next_tf_dir              = "../.next-tf"
  debug_use_local_packages = false

  providers = {
    aws.global = aws.virginia
  }
}

