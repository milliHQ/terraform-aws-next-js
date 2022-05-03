locals {
  origin_id = "Proxy-Config-Edge"
}

#############
# Lambda@Edge
#############

data "aws_iam_policy_document" "access_resources" {
  # Access the aliases dynamodb table
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:Query",
    ]
    resources = [
      var.dynamodb_table_aliases_arn
    ]
  }

  # Query the S3 bucket for static files
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject"
    ]
    resources = [
      "${var.static_deploy_bucket_arn}/*"
    ]
  }
}

module "proxy_config_package" {
  source  = "milliHQ/download/npm"
  version = "2.1.0"

  module_name    = "@millihq/terraform-next-proxy-config"
  module_version = var.proxy_config_module_version
  path_to_file   = "dist.zip"
  use_local      = var.debug_use_local_packages
  local_cwd      = var.tf_next_module_root
}

module "proxy_config" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "3.1.0"

  lambda_at_edge = true

  function_name = "${var.deployment_name}_tfn-proxy-config"
  description   = "Managed by Terraform Next.js"
  handler       = "handler.handler"
  runtime       = var.lambda_runtime
  memory_size   = 1024
  timeout       = 30

  attach_policy_json        = true
  policy_json               = data.aws_iam_policy_document.access_resources.json
  role_permissions_boundary = var.lambda_role_permissions_boundary

  create_package         = false
  local_existing_package = module.proxy_config_package.rel_path

  cloudwatch_logs_retention_in_days = 30

  tags = var.tags

  providers = {
    aws = aws.global_region
  }
}

############
# CloudFront
############

# Managed origin request policy
data "aws_cloudfront_origin_request_policy" "managed_cors_custom_origin" {
  name = "Managed-CORS-CustomOrigin"
}

# Managed cache policy
data "aws_cloudfront_cache_policy" "managed_caching_optimized_for_uncompressed_objects" {
  name = "Managed-CachingOptimizedForUncompressedObjects"
}

resource "aws_cloudfront_distribution" "distribution" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.deployment_name} - Proxy-Config"
  price_class     = var.cloudfront_price_class

  # Dummy origin, since all requests are served from Lambda@Edge and never
  # reach the custom origin endpoint.
  origin {
    domain_name = "milli.is"
    origin_id   = local.origin_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["SSLv3", "TLSv1", "TLSv1.1", "TLSv1.2"]
    }

    custom_header {
      name  = "x-env-dynamodb-region"
      value = var.dynamodb_region
    }

    custom_header {
      name  = "x-env-dynamodb-table-aliases"
      value = var.dynamodb_table_aliases_name
    }

    custom_header {
      name  = "x-env-bucket-region"
      value = var.static_deploy_bucket_region
    }

    custom_header {
      name  = "x-env-bucket-id"
      value = var.static_deploy_bucket_id
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.origin_id

    # Allow connections via HTTP to improve speed
    viewer_protocol_policy = "allow-all"

    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.managed_cors_custom_origin.id
    cache_policy_id          = data.aws_cloudfront_cache_policy.managed_caching_optimized_for_uncompressed_objects.id
    lambda_function_association {
      event_type   = "origin-request"
      lambda_arn   = module.proxy_config.lambda_function_qualified_arn
      include_body = false
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = var.tags
}
