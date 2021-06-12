resource "aws_cloudfront_distribution" "distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.deployment_name} - Main"
  price_class         = var.cloudfront_price_class
  default_root_object = var.cloudfront_default_root_object

  # Add CloudFront origins
  dynamic "origin" {
    for_each = var.cloudfront_origins != null ? var.cloudfront_origins : []
    content {
      domain_name = origin.value["domain_name"]
      origin_id   = origin.value["origin_id"]

      dynamic "s3_origin_config" {
        for_each = lookup(origin.value, "s3_origin_config", null) != null ? [true] : []
        content {
          origin_access_identity = lookup(origin.value["s3_origin_config"], "origin_access_identity", null)
        }
      }

      dynamic "custom_origin_config" {
        for_each = lookup(origin.value, "custom_origin_config", null) != null ? [true] : []

        content {
          http_port                = lookup(origin.value["custom_origin_config"], "http_port", null)
          https_port               = lookup(origin.value["custom_origin_config"], "https_port", null)
          origin_protocol_policy   = lookup(origin.value["custom_origin_config"], "origin_protocol_policy", null)
          origin_ssl_protocols     = lookup(origin.value["custom_origin_config"], "origin_ssl_protocols", null)
          origin_keepalive_timeout = lookup(origin.value["custom_origin_config"], "origin_keepalive_timeout", null)
          origin_read_timeout      = lookup(origin.value["custom_origin_config"], "origin_read_timeout", null)
        }
      }

      dynamic "custom_header" {
        for_each = origin.value["custom_header"]

        content {
          name  = custom_header.value["name"]
          value = custom_header.value["value"]
        }
      }
    }
  }

  # Lambda@Edge Proxy
  dynamic "default_cache_behavior" {
    for_each = [var.cloudfront_default_behavior]

    content {
      allowed_methods  = default_cache_behavior.value["allowed_methods"]
      cached_methods   = default_cache_behavior.value["cached_methods"]
      target_origin_id = default_cache_behavior.value["target_origin_id"]

      viewer_protocol_policy = default_cache_behavior.value["viewer_protocol_policy"]
      compress               = default_cache_behavior.value["compress"]

      origin_request_policy_id = default_cache_behavior.value["origin_request_policy_id"]
      cache_policy_id          = default_cache_behavior.value["cache_policy_id"]

      dynamic "lambda_function_association" {
        for_each = [default_cache_behavior.value["lambda_function_association"]]

        content {
          event_type   = lambda_function_association.value["event_type"]
          lambda_arn   = lambda_function_association.value["lambda_arn"]
          include_body = lambda_function_association.value["include_body"]
        }
      }
    }
  }

  # Custom behaviors
  dynamic "ordered_cache_behavior" {
    for_each = var.cloudfront_custom_behaviors != null ? var.cloudfront_custom_behaviors : []
    content {
      path_pattern     = ordered_cache_behavior.value["path_pattern"]
      allowed_methods  = ordered_cache_behavior.value["allowed_methods"]
      cached_methods   = ordered_cache_behavior.value["cached_methods"]
      target_origin_id = ordered_cache_behavior.value["target_origin_id"]

      compress               = ordered_cache_behavior.value["compress"]
      viewer_protocol_policy = ordered_cache_behavior.value["viewer_protocol_policy"]

      origin_request_policy_id = ordered_cache_behavior.value["origin_request_policy_id"]
      cache_policy_id          = ordered_cache_behavior.value["cache_policy_id"]
    }
  }

  # Custom error response when a doc is not found in S3 (returns 403)
  # Then shows the 404 page
  custom_error_response {
    error_caching_min_ttl = 60
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404"
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
