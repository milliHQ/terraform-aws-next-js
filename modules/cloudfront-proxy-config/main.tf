locals {
  s3_origin_id         = "S3-Proxy-Config-${aws_s3_bucket.proxy_config_store.id}"
  proxy_config_key     = "proxy-config.json"
  proxy_config_max_age = 15 * 60
}

########
# Bucket
########

resource "aws_s3_bucket" "proxy_config_store" {
  bucket_prefix = "${var.deployment_name}-tfn-config"
  force_destroy = true
  tags          = merge(var.tags, var.tags_s3_bucket)
}

resource "aws_s3_bucket_acl" "proxy_config_store" {
  bucket = aws_s3_bucket.proxy_config_store.id
  acl    = "private"
}

data "aws_iam_policy_document" "cf_access" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.proxy_config_store.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.this.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "proxy_config_store_origin_access" {
  bucket = aws_s3_bucket.proxy_config_store.id
  policy = data.aws_iam_policy_document.cf_access.json
}

#####################
# Upload Proxy Config
#####################

resource "aws_s3_object" "config_json" {
  bucket        = aws_s3_bucket.proxy_config_store.id
  key           = local.proxy_config_key
  content       = var.proxy_config_json
  content_type  = "application/json"
  cache_control = "max-age=${local.proxy_config_max_age}"
  tags          = var.tags

  etag = md5(var.proxy_config_json)
}

############
# CloudFront
############

# Managed origin request policy
data "aws_cloudfront_origin_request_policy" "managed_cors_s3_origin" {
  name = "Managed-CORS-S3Origin"
}

# Managed cache policy
data "aws_cloudfront_cache_policy" "managed_caching_optimized_for_uncompressed_objects" {
  name = "Managed-CachingOptimizedForUncompressedObjects"
}

resource "aws_cloudfront_origin_access_identity" "this" {
  comment = "S3 CloudFront access ${aws_s3_bucket.proxy_config_store.id}"
}

resource "aws_cloudfront_distribution" "distribution" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.deployment_name} - Proxy-Config"
  price_class     = var.cloudfront_price_class

  origin {
    domain_name = aws_s3_bucket.proxy_config_store.bucket_regional_domain_name
    origin_id   = local.s3_origin_id

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.this.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    # Allow connections via HTTP to improve speed
    viewer_protocol_policy = "allow-all"

    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.managed_cors_s3_origin.id
    cache_policy_id          = data.aws_cloudfront_cache_policy.managed_caching_optimized_for_uncompressed_objects.id
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
