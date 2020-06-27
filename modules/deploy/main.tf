########
# Bucket
########

resource "aws_s3_bucket" "lambda_storage" {
  bucket_prefix = "next-tf-deploy-source"
  acl           = "private"
}

########
# Lambda
########

resource "random_id" "function_name" {
  prefix      = "next-tf-proxy-"
  byte_length = 4
}

module "deploy_trigger" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 1.16.0"

  function_name = random_id.function_name.hex
  description   = "Managed by Terraform-next.js"
  handler       = "handler.handler"
  runtime       = "nodejs12.x"

  source_path = "../src/lambda-function1"
}
