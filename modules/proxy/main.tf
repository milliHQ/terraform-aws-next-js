locals {
  origin_id_api_gateway       = "ApiGateway"
  origin_id_static_deployment = "S3 Static Deployment"
}


module "proxy_package" {
  source = "../file-from-npm"

  module_name  = "@dealmore/terraform-next-proxy"
  path_to_file = "dist.zip"
}

resource "random_id" "function_name" {
  prefix      = "next-tf-proxy-"
  byte_length = 4
}

module "edge_proxy" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 1.16.0"

  lambda_at_edge = true

  function_name = random_id.function_name.hex
  description   = "Managed by Terraform-next.js"
  handler       = "handler.handler"
  runtime       = "nodejs12.x"

  create_package         = false
  local_existing_package = module.proxy_package.abs_path

  cloudwatch_logs_retention_in_days = 30
}

############
# CloudFront
############

resource "aws_cloudfront_distribution" "distribution" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "Managed by Terraform-next.js"
  price_class     = var.cloudfront_price_class
  # aliases         = [var.domain_name]

  # Static deployment S3 bucket
  origin {
    domain_name = var.static_bucket_endpoint
    origin_id   = local.origin_id_static_deployment

    s3_origin_config {
      origin_access_identity = var.static_bucket_access_identity
    }
  }

  # Lambda@Edge Proxy
  origin {
    domain_name = var.api_gateway_endpoint
    origin_id   = local.origin_id_api_gateway

    custom_origin_config {
      http_port              = "80"
      https_port             = "443"
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Lambda@Edge Proxy
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.origin_id_api_gateway

    forwarded_values {
      query_string = true

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    lambda_function_association {
      event_type   = "origin-request"
      lambda_arn   = module.edge_proxy.this_lambda_function_qualified_arn
      include_body = false
    }
  }

  ordered_cache_behavior {
    path_pattern     = "/_next/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.origin_id_static_deployment

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # ssl_support_method             = "sni-only"
    # minimum_protocol_version       = "TLSv1.2_2018"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
