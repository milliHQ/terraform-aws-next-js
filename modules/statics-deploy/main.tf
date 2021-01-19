locals {
  lambda_policies = [
    aws_iam_policy.access_static_upload.arn,
    aws_iam_policy.access_static_deploy.arn
  ]
  manifest_key = "_tf-next/deployment.json"
}

########################
# Upload Bucket (zipped)
########################

resource "aws_s3_bucket" "static_upload" {
  bucket_prefix = "next-tf-deploy-source"
  acl           = "private"
  force_destroy = true
  tags          = var.tags

  # We are using versioning here to ensure that no file gets overridden at upload
  versioning {
    enabled = true
  }
}

data "aws_iam_policy_document" "access_static_upload" {
  statement {
    actions   = ["s3:GetObject", "s3:GetObjectVersion", "s3:DeleteObject", "s3:DeleteObjectVersion"]
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

#########################
# Serve Bucket (unzipped)
#########################

resource "aws_s3_bucket" "static_deploy" {
  bucket_prefix = "next-tf-static-deploy"
  acl           = "private"
  force_destroy = true
  tags          = var.tags

  lifecycle_rule {
    id      = "Expire static assets"
    enabled = var.expire_static_assets >= 0 # -1 disables the cleanup

    tags = {
      "tfnextExpire" = "true"
    }

    expiration {
      days = var.expire_static_assets > 0 ? var.expire_static_assets : 0
    }
  }
}

# CloudFront permissions for the bucket

resource "aws_cloudfront_origin_access_identity" "this" {
  comment = "S3 CloudFront access ${aws_s3_bucket.static_deploy.id}"
}

data "aws_iam_policy_document" "cf_access" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.static_deploy.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.this.iam_arn]
    }
  }

  # Do not expose the manifest to the public
  statement {
    effect    = "Deny"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.static_deploy.arn}/${local.manifest_key}"]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.this.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "origin_access" {
  bucket = aws_s3_bucket.static_deploy.id
  policy = data.aws_iam_policy_document.cf_access.json
}

# Lambda permissions for updating the static files bucket
# and to create CloudFront invalidations

data "aws_iam_policy_document" "access_static_deploy" {
  statement {
    actions = [
      "s3:ListBucket",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetObjectTagging",
      "s3:PutObjectTagging"
    ]
    resources = [
      aws_s3_bucket.static_deploy.arn,
      "${aws_s3_bucket.static_deploy.arn}/*"
    ]
  }

  statement {
    actions = [
      "cloudfront:CreateInvalidation"
    ]
    resources = [var.cloudfront_arn]
  }
}

resource "aws_iam_policy" "access_static_deploy" {
  name_prefix = "next-tf"
  description = "S3 access for ${aws_s3_bucket.static_deploy.id} bucket"

  policy = data.aws_iam_policy_document.access_static_deploy.json
}

########
# Lambda
########

module "lambda_content" {
  source = "../file-from-npm"

  module_name    = "@dealmore/terraform-next-deploy-trigger"
  module_version = var.deploy_trigger_module_version
  path_to_file   = "dist.zip"
  use_local      = var.debug_use_local_packages
}

resource "random_id" "function_name" {
  prefix      = "next-tf-deploy-"
  byte_length = 4
}

module "deploy_trigger" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "1.34.0"

  function_name = random_id.function_name.hex
  description   = "Managed by Terraform-next.js"
  handler       = "handler.handler"
  runtime       = "nodejs12.x"
  memory_size   = 1024
  timeout       = 60
  publish       = true
  tags          = var.tags
  role_permissions_boundary = var.lambda_role_permissions_boundary

  create_package         = false
  local_existing_package = module.lambda_content.abs_path

  # Prevent running concurrently
  reserved_concurrent_executions = 1

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

  environment_variables = {
    NODE_ENV          = "production"
    TARGET_BUCKET     = aws_s3_bucket.static_deploy.id
    EXPIRE_AFTER_DAYS = var.expire_static_assets >= 0 ? var.expire_static_assets : "never"
    DISTRIBUTION_ID   = var.cloudfront_id
  }
}

###########################
# Upload static files to s3
###########################

resource "null_resource" "static_s3_upload" {
  triggers = {
    static_files_archive = filemd5(var.static_files_archive)
  }

  provisioner "local-exec" {
    command     = "./s3-put -r ${aws_s3_bucket.static_upload.region} -T ${abspath(var.static_files_archive)} /${aws_s3_bucket.static_upload.id}/${basename(var.static_files_archive)}"
    working_dir = "${path.module}/s3-bash4/bin"
  }

  # Make sure this only runs when the bucket and the lambda trigger are setup
  depends_on = [
    aws_s3_bucket_notification.on_create
  ]
}
