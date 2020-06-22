
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

  next_tf_dir = "../.next-tf"

  providers = {
    aws.global = aws.virginia
  }
}

