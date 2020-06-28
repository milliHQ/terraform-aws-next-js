locals {
  lambda_policies = [aws_iam_policy.access_static_upload.arn]
}

########
# Bucket
########

resource "aws_s3_bucket" "static_upload" {
  bucket_prefix = "next-tf-deploy-source"
  acl           = "private"

  # We are using versioning here to ensure that no file gets overridden at upload
  versioning {
    enabled = true
  }
}

data "aws_iam_policy_document" "access_static_upload" {
  statement {
    actions   = ["s3:DeleteObject", "s3:DeleteObjectVersion"]
    resources = ["${aws_s3_bucket.static_upload.arn}/*"]
  }
}

resource "aws_iam_policy" "access_static_upload" {
  name_prefix = "next-tf"
  description = "S3 access for ${aws_s3_bucket.static_upload.id} bucket"

  policy = data.aws_iam_policy_document.access_static_upload.json
}

resource "aws_s3_bucket_notification" "on_create" {
  bucket = aws_s3_bucket.static_upload.id

  lambda_function {
    lambda_function_arn = module.deploy_trigger.this_lambda_function_arn
    events              = ["s3:ObjectCreated:*"]
  }
}

########
# Lambda
########

module "lambda_content" {
  source = "../file-from-npm"

  module_name  = "@dealmore/terraform-next-deploy-trigger"
  path_to_file = "dist.zip"
}

resource "random_id" "function_name" {
  prefix      = "next-tf-deploy-"
  byte_length = 4
}

module "deploy_trigger" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 1.16.0"

  function_name = random_id.function_name.hex
  description   = "Managed by Terraform-next.js"
  handler       = "handler.handler"
  runtime       = "nodejs12.x"
  publish       = true

  create_package         = false
  local_existing_package = module.lambda_content.abs_path

  cloudwatch_logs_retention_in_days = 14

  allowed_triggers = {
    AllowExecutionFromS3Bucket = {
      service    = "s3"
      source_arn = aws_s3_bucket.static_upload.arn
    }
  }

  attach_policies    = length(local.lambda_policies) > 0 ? true : false
  number_of_policies = length(local.lambda_policies)
  policies           = local.lambda_policies
}
