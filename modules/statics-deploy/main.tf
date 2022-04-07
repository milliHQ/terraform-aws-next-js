locals {
  manifest_key   = "_tf-next/deployment.json"
  lambda_timeout = 60
}

########################
# Upload Bucket (zipped)
########################

resource "aws_s3_bucket" "static_upload" {
  bucket_prefix = "${var.deployment_name}-tfn-deploy"
  force_destroy = true

  tags = merge(var.tags, var.tags_s3_bucket)
}

resource "aws_s3_bucket_acl" "static_upload" {
  bucket = aws_s3_bucket.static_upload.id
  acl    = "private"
}

# We are using versioning here to ensure that no file gets overridden at upload
resource "aws_s3_bucket_versioning" "static_upload" {
  bucket = aws_s3_bucket.static_upload.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_notification" "on_create" {
  bucket = aws_s3_bucket.static_upload.id

  lambda_function {
    lambda_function_arn = module.deploy_trigger.lambda_function_arn
    events              = ["s3:ObjectCreated:*"]
  }
}

#########################
# Serve Bucket (unzipped)
#########################

resource "aws_s3_bucket" "static_deploy" {
  bucket_prefix = "${var.deployment_name}-tfn-static"
  force_destroy = true

  tags = merge(var.tags, var.tags_s3_bucket)
}

resource "aws_s3_bucket_acl" "static_deploy" {
  bucket = aws_s3_bucket.static_deploy.id
  acl    = "private"
}

resource "aws_s3_bucket_lifecycle_configuration" "static_deploy" {
  bucket = aws_s3_bucket.static_deploy.id

  rule {
    id = "Expire static assets"

    expiration {
      days = var.expire_static_assets > 0 ? var.expire_static_assets : 0
    }

    filter {
      tag {
        key   = "tfnextExpire"
        value = "true"
      }
    }

    status = var.expire_static_assets >= 0 ? "Enabled" : "Disabled" # -1 disables the cleanup
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

########
# Lambda
########

# TODO: Look into if it would be more sense to combine all policies here into
# a single ressorce

#
# Lambda permissions for updating the static files bucket and to create
# CloudFront invalidations
#
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

#
# Lambda permission to download the zipped static uploads package
#
data "aws_iam_policy_document" "access_static_upload" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:DeleteObject",
      "s3:DeleteObjectVersion"
    ]
    resources = ["${aws_s3_bucket.static_upload.arn}/*"]
  }
}

#
# Lambda permission to access the SQS queue
#
data "aws_iam_policy_document" "access_sqs_queue" {
  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:SendMessage",
      "sqs:GetQueueUrl",
      "sqs:GetQueueAttributes",
      "sqs:ChangeMessageVisibility",
    ]

    resources = [
      aws_sqs_queue.this.arn
    ]
  }
}

module "lambda_content" {
  source  = "milliHQ/download/npm"
  version = "2.1.0"

  module_name    = "@millihq/terraform-next-deploy-trigger"
  module_version = var.deploy_trigger_module_version
  path_to_file   = "dist.zip"
  use_local      = var.debug_use_local_packages
  local_cwd      = var.tf_next_module_root
}

module "deploy_trigger" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "3.1.0"

  function_name             = "${var.deployment_name}_tfn-deploy"
  description               = "Managed by Terraform Next.js"
  handler                   = "handler.handler"
  runtime                   = "nodejs14.x"
  memory_size               = 1024
  timeout                   = local.lambda_timeout
  publish                   = true
  tags                      = var.tags
  role_permissions_boundary = var.lambda_role_permissions_boundary

  create_package         = false
  local_existing_package = module.lambda_content.rel_path

  # Prevent running concurrently
  reserved_concurrent_executions = 1

  cloudwatch_logs_retention_in_days = 14

  allowed_triggers = {
    AllowExecutionFromS3Bucket = {
      service    = "s3"
      source_arn = aws_s3_bucket.static_upload.arn
    }
    InvalidationQueue = {
      principal  = "sqs.amazonaws.com"
      source_arn = aws_sns_topic.this.arn
    },
  }

  attach_policy_jsons    = true
  number_of_policy_jsons = 3
  policy_jsons = [
    data.aws_iam_policy_document.access_static_deploy.json,
    data.aws_iam_policy_document.access_static_upload.json,
    data.aws_iam_policy_document.access_sqs_queue.json
  ]

  environment_variables = {
    NODE_ENV          = "production"
    TARGET_BUCKET     = aws_s3_bucket.static_deploy.id
    EXPIRE_AFTER_DAYS = var.expire_static_assets >= 0 ? var.expire_static_assets : "never"
    DISTRIBUTION_ID   = var.cloudfront_id
    SQS_QUEUE_URL     = aws_sqs_queue.this.id
  }

  event_source_mapping = {
    sqs_source = {
      batch_size       = 10 # Maximum batch size for SQS
      event_source_arn = aws_sqs_queue.this.arn
    }
  }
}

###########################
# Upload static files to s3
###########################

resource "null_resource" "static_s3_upload_awscli" {
  count = var.use_awscli_for_static_upload ? 1 : 0
  triggers = {
    static_files_archive = filemd5(var.static_files_archive)
  }

  provisioner "local-exec" {
    command = "aws s3 cp --region ${aws_s3_bucket.static_upload.region} ${abspath(var.static_files_archive)} s3://${aws_s3_bucket.static_upload.id}/${basename(var.static_files_archive)}"
  }

  # Make sure this only runs when the bucket and the lambda trigger are setup
  depends_on = [
    aws_s3_bucket_notification.on_create
  ]
}

resource "null_resource" "static_s3_upload" {
  count = var.use_awscli_for_static_upload ? 0 : 1
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

################################
# SQS Queue
# (For CloudFront invalidations)
################################
resource "aws_sns_topic" "this" {
  name_prefix = var.deployment_name

  tags = var.tags
}

resource "aws_sqs_queue" "this" {
  name_prefix               = var.deployment_name
  message_retention_seconds = var.sqs_message_retention_seconds
  receive_wait_time_seconds = var.sqs_receive_wait_time_seconds

  # SQS visibility_timeout_seconds must be >= lambda fn timeout,
  # aws reccomends at least 6 times the lambda
  # https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
  visibility_timeout_seconds = local.lambda_timeout * 6

  tags = var.tags
}

resource "aws_sns_topic_subscription" "this" {
  topic_arn = aws_sns_topic.this.arn
  endpoint  = aws_sqs_queue.this.arn
  protocol  = "sqs"
}

data "aws_iam_policy_document" "sqs_queue" {
  statement {
    actions = [
      "sqs:SendMessage",
    ]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"

      values = [
        aws_sns_topic.this.arn,
        module.deploy_trigger.lambda_function_arn
      ]
    }

    principals {
      type = "AWS"

      identifiers = [
        "*",
      ]
    }

    resources = [
      module.deploy_trigger.lambda_function_arn,
    ]
  }
}

resource "aws_sqs_queue_policy" "this" {
  queue_url = aws_sqs_queue.this.id
  policy    = data.aws_iam_policy_document.sqs_queue.json
}
