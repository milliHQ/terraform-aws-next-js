
provider "aws" {
  version = "~> 2.0"
  region  = var.aws_region
}

module "lambdas" {
  source = "../../.."

  next_tf_dir = "../.next-tf"
}

