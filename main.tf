data "aws_region" "current" {}

##########
# DynamoDB
##########

# Please see the documentation in packages/dynamodb-actions for information
# about the used schema.

resource "aws_dynamodb_table" "aliases" {
  name         = "${var.deployment_name}_aliases"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "DeploymentIdIndex"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "INCLUDE"
    non_key_attributes = [
      "BasePath",
      "CreateDate",
      "DeploymentId",
      "DeploymentAlias",
      "HostnameRev"
    ]
  }

  tags = var.tags
}

# Using infrequent access tier here since this table is only used during API
# operations (creating deployments and aliases), but serves no customer facing
# purposes.
resource "aws_dynamodb_table" "deployments" {
  name         = "${var.deployment_name}_deployments"
  billing_mode = "PAY_PER_REQUEST"
  table_class  = "STANDARD_INFREQUENT_ACCESS"

  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name               = "CreateDateIndex"
    hash_key           = "PK"
    range_key          = "GSI1SK"
    projection_type    = "INCLUDE"
    non_key_attributes = ["CreateDate", "DeploymentAlias", "DeploymentId", "Status"]
  }

  tags = var.tags
}

#####################
# CloudFormation Role
#####################

# Policy that controls which actions can be performed when CloudFormation
# creates a substack (from CDK)
data "aws_iam_policy_document" "cloudformation_permission" {
  # Allow CloudFormation to publish status changes to the SNS queue
  statement {
    effect = "Allow"
    actions = [
      "sns:Publish"
    ]
    resources = [module.deploy_controller.sns_topic_arn]
  }

  # Allow CloudFormation to access the lambda content
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject"
    ]
    resources = [
      module.statics_deploy.static_bucket_arn,
      "${module.statics_deploy.static_bucket_arn}/*"
    ]
  }

  # Stack creation
  statement {
    effect = "Allow"
    actions = [
      # TODO: Restrict the API Gateway action more
      "apigateway:*",
      "iam:CreateRole",
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:PassRole",
      "iam:PutRolePolicy",
      "iam:TagRole",
      "lambda:AddPermission",
      "lambda:CreateFunction",
      "lambda:CreateFunctionUrlConfig",
      "lambda:GetFunctionUrlConfig",
      "lambda:GetFunction",
      "lambda:TagResource",
      "logs:CreateLogGroup",
      "logs:PutRetentionPolicy",
      "logs:TagLogGroup"
    ]
    resources = ["*"]
  }

  # Stack deletion
  statement {
    effect = "Allow"
    actions = [
      "apigateway:*",
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
      "iam:UntagRole",
      "lambda:DeleteFunction",
      "lambda:DeleteFunctionUrlConfig",
      "lambda:RemovePermission",
      "lambda:UntagResource",
      "logs:DeleteLogGroup",
      "logs:DeleteRetentionPolicy",
      "logs:UntagLogGroup"
    ]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "cloudformation_permission_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["cloudformation.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "cloudformation_permission" {
  name        = "${var.deployment_name}_cf-control"
  description = "Managed by Terraform Next.js"
  policy      = data.aws_iam_policy_document.cloudformation_permission.json

  tags = var.tags
}

resource "aws_iam_role" "cloudformation_permission" {
  name               = "${var.deployment_name}_cf-control"
  assume_role_policy = data.aws_iam_policy_document.cloudformation_permission_assume_role.json
  managed_policy_arns = [
    aws_iam_policy.cloudformation_permission.arn
  ]
}

###################
# Deploy Controller
###################

module "deploy_controller" {
  source = "./modules/deploy-controller"

  dynamodb_region                 = data.aws_region.current.name
  dynamodb_table_aliases_arn      = aws_dynamodb_table.aliases.arn
  dynamodb_table_aliases_name     = aws_dynamodb_table.aliases.id
  dynamodb_table_deployments_arn  = aws_dynamodb_table.deployments.arn
  dynamodb_table_deployments_name = aws_dynamodb_table.deployments.id

  enable_multiple_deployments      = var.enable_multiple_deployments
  multiple_deployments_base_domain = var.multiple_deployments_base_domain

  deployment_name = var.deployment_name
  tags            = var.tags

  debug_use_local_packages = var.debug_use_local_packages
  tf_next_module_root      = path.module
}

###################
# Deployment Lambda
###################

# Static deployment to S3 website and handles CloudFront invalidations
module "statics_deploy" {
  source = "./modules/statics-deploy"

  cloudfront_id               = var.cloudfront_create_distribution ? module.cloudfront_main[0].cloudfront_id : var.cloudfront_external_id
  cloudfront_arn              = var.cloudfront_create_distribution ? module.cloudfront_main[0].cloudfront_arn : var.cloudfront_external_arn
  deploy_status_sns_topic_arn = module.deploy_controller.sns_topic_arn

  dynamodb_region                 = data.aws_region.current.name
  dynamodb_table_aliases_arn      = aws_dynamodb_table.aliases.arn
  dynamodb_table_aliases_name     = aws_dynamodb_table.aliases.id
  dynamodb_table_deployments_arn  = aws_dynamodb_table.deployments.arn
  dynamodb_table_deployments_name = aws_dynamodb_table.deployments.id

  cloudformation_role_arn = aws_iam_role.cloudformation_permission.arn

  enable_multiple_deployments      = var.enable_multiple_deployments
  multiple_deployments_base_domain = var.multiple_deployments_base_domain

  lambda_role_permissions_boundary = var.lambda_role_permissions_boundary

  deployment_name = var.deployment_name
  tags            = var.tags
  tags_s3_bucket  = var.tags_s3_bucket

  debug_use_local_packages = var.debug_use_local_packages
  tf_next_module_root      = path.module
}

#####
# API
#####

module "api" {
  source = "./modules/api"

  dynamodb_region                 = data.aws_region.current.name
  dynamodb_table_aliases_arn      = aws_dynamodb_table.aliases.arn
  dynamodb_table_aliases_name     = aws_dynamodb_table.aliases.id
  dynamodb_table_deployments_arn  = aws_dynamodb_table.deployments.arn
  dynamodb_table_deployments_name = aws_dynamodb_table.deployments.id
  upload_bucket_id                = module.statics_deploy.upload_bucket_id
  upload_bucket_region            = module.statics_deploy.upload_bucket_region
  upload_bucket_arn               = module.statics_deploy.upload_bucket_arn

  deployment_name = var.deployment_name
  tags            = var.tags

  debug_use_local_packages = var.debug_use_local_packages
  tf_next_module_root      = path.module
}

############
# Next/Image
############

# Permission for image optimizer to fetch images from S3 deployment
data "aws_iam_policy_document" "access_static_deployment" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${module.statics_deploy.static_bucket_arn}/*"]
  }
}

module "next_image" {
  count = var.create_image_optimization ? 1 : 0

  source  = "milliHQ/next-js-image-optimization/aws"
  version = ">= 12.1.0"

  cloudfront_create_distribution = false

  # tf-next does not distinct between image and device sizes, because they
  # are eventually merged together on the image optimizer.
  # So we only use a single key (next_image_domains) to pass ALL (image &
  # device) sizes to the optimizer and by setting the other
  # (next_image_device_sizes) to an empty array which prevents the optimizer
  # from adding the default device settings

  # TODO: Find way to pass these dynamically from the deployment
  next_image_domains      = []
  next_image_image_sizes  = []
  next_image_device_sizes = []

  source_bucket_id = module.statics_deploy.static_bucket_id

  lambda_memory_size               = var.image_optimization_lambda_memory_size
  lambda_attach_policy_json        = true
  lambda_policy_json               = data.aws_iam_policy_document.access_static_deployment.json
  lambda_role_permissions_boundary = var.lambda_role_permissions_boundary

  deployment_name = "${var.deployment_name}_tfn-image"
  tags            = var.tags
}

#########################
# CloudFront Proxy Config
#########################

module "proxy_config" {
  source = "./modules/cloudfront-proxy-config"

  cloudfront_price_class           = var.cloudfront_price_class
  lambda_role_permissions_boundary = var.lambda_role_permissions_boundary

  dynamodb_region             = data.aws_region.current.name
  dynamodb_table_aliases_arn  = aws_dynamodb_table.aliases.arn
  dynamodb_table_aliases_name = aws_dynamodb_table.aliases.id

  static_deploy_bucket_region = module.statics_deploy.static_bucket_region
  static_deploy_bucket_arn    = module.statics_deploy.static_bucket_arn
  static_deploy_bucket_id     = module.statics_deploy.static_bucket_id

  deployment_name = var.deployment_name
  tags            = var.tags

  debug_use_local_packages = var.debug_use_local_packages
  tf_next_module_root      = path.module

  providers = {
    aws.global_region = aws.global_region
  }
}

#####################
# Proxy (Lambda@Edge)
#####################

module "proxy" {
  source = "./modules/proxy"

  lambda_role_permissions_boundary = var.lambda_role_permissions_boundary

  deployment_name = var.deployment_name
  tags            = var.tags

  debug_use_local_packages = var.debug_use_local_packages
  tf_next_module_root      = path.module

  providers = {
    aws.global_region = aws.global_region
  }
}

#########################
# CloudFront distribution
#########################

# Origin & Cache Policies
#########################

# Managed origin policy for default behavior
data "aws_cloudfront_origin_request_policy" "managed_all_viewer" {
  name = "Managed-AllViewer"
}

locals {
  # Default headers on which the cache key should be determined
  #
  # host - When using multiple domains host header ensures that each
  #        (sub-)domain has a unique cache key
  cloudfront_cache_default_key_headers = ["host"]
  cloudfront_cache_key_headers = sort(concat(
    local.cloudfront_cache_default_key_headers,
    var.cloudfront_cache_key_headers
  ))
}

resource "aws_cloudfront_cache_policy" "this" {
  name    = "${var.deployment_name}_tfn-cache"
  comment = "Managed by Terraform Next.js"

  # Default values (Should be provided by origin)
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }

    headers_config {
      header_behavior = "whitelist"

      headers {
        items = local.cloudfront_cache_key_headers
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }

    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

locals {
  # CloudFront default root object
  ################################
  cloudfront_default_root_object = ""

  # CloudFront Origins
  ####################

  # Default origin (With config for Lambda@Edge Proxy)
  cloudfront_origin_static_content = {
    domain_name = module.statics_deploy.static_bucket_endpoint
    origin_id   = "tf-next-s3-static-content"

    s3_origin_config = {
      origin_access_identity = module.statics_deploy.static_bucket_access_identity
    }

    custom_header = [
      {
        // Intentionally using http here (instead of https) to safe the time
        // the SSL handshake costs.
        name  = "x-env-config-endpoint"
        value = "http://${module.proxy_config.config_endpoint}"
      },
    ]
  }

  # Little hack here to create a dynamic object with different number of attributes
  # using filtering: https://www.terraform.io/docs/language/expressions/for.html#filtering-elements
  _cloudfront_origins = {
    static_content = merge(local.cloudfront_origin_static_content, { create = true })
    next_image = merge(
      var.create_image_optimization ? module.next_image[0].cloudfront_origin : null, {
        create = var.create_image_optimization
    })
  }

  cloudfront_origins = {
    for key, origin in local._cloudfront_origins : key => origin
    if origin.create
  }

  # CloudFront behaviors
  ######################

  # Default CloudFront behavior
  # (Lambda@Edge Proxy)
  cloudfront_default_behavior = {
    default_behavior = {
      allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods   = ["GET", "HEAD"]
      target_origin_id = local.cloudfront_origin_static_content.origin_id

      compress               = true
      viewer_protocol_policy = "redirect-to-https"

      origin_request_policy_id   = var.cloudfront_origin_request_policy != null ? var.cloudfront_origin_request_policy : data.aws_cloudfront_origin_request_policy.managed_all_viewer.id
      response_headers_policy_id = var.cloudfront_response_headers_policy
      cache_policy_id            = aws_cloudfront_cache_policy.this.id

      lambda_function_association = {
        event_type   = "origin-request"
        lambda_arn   = module.proxy.lambda_edge_arn
        include_body = false
      }
    }
  }

  # next/image behavior
  cloudfront_ordered_cache_behavior_next_image = var.create_image_optimization ? module.next_image[0].cloudfront_cache_behavior : null

  # Little hack here to create a dynamic object with different number of attributes
  # using filtering: https://www.terraform.io/docs/language/expressions/for.html#filtering-elements
  _cloudfront_ordered_cache_behaviors = {
    next_image = merge(local.cloudfront_ordered_cache_behavior_next_image, {
      create = var.create_image_optimization
    })
  }

  cloudfront_ordered_cache_behaviors = {
    for key, behavior in local._cloudfront_ordered_cache_behaviors : key => behavior
    if behavior.create
  }

  cloudfront_custom_error_response = {
    s3_failover = {
      error_caching_min_ttl = 60
      error_code            = 403
      response_code         = 404
      response_page_path    = "/404"
    }
  }
}

module "cloudfront_main" {
  count = var.cloudfront_create_distribution ? 1 : 0

  source = "./modules/cloudfront-main"

  cloudfront_price_class              = var.cloudfront_price_class
  cloudfront_aliases                  = var.cloudfront_aliases
  cloudfront_acm_certificate_arn      = var.cloudfront_acm_certificate_arn
  cloudfront_minimum_protocol_version = var.cloudfront_minimum_protocol_version
  cloudfront_webacl_id                = var.cloudfront_webacl_id

  cloudfront_default_root_object     = local.cloudfront_default_root_object
  cloudfront_origins                 = local.cloudfront_origins
  cloudfront_default_behavior        = local.cloudfront_default_behavior
  cloudfront_ordered_cache_behaviors = local.cloudfront_ordered_cache_behaviors
  cloudfront_custom_error_response   = local.cloudfront_custom_error_response

  deployment_name = var.deployment_name
  tags            = var.tags
}
