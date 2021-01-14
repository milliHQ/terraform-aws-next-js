locals {
  s3_origin_id         = "S3-Proxy-Config-${aws_s3_bucket.proxy_config.id}"
  proxy_config_key     = "proxy-config.json"
  proxy_config_max_age = 15 * 60
}

########
# Bucket
########

resource "aws_s3_bucket" "proxy_config" {
  bucket_prefix = "next-tf-proxy-config"
  acl           = "private"
  force_destroy = true
  tags          = var.tags
}

data "aws_iam_policy_document" "cf_access" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.proxy_config.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.this.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "origin_access" {
  bucket = aws_s3_bucket.proxy_config.id
  policy = data.aws_iam_policy_document.cf_access.json
}

#####################
# Upload Proxy Config
#####################

resource "aws_s3_bucket_object" "proxy_config" {
  bucket        = aws_s3_bucket.proxy_config.id
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

resource "aws_cloudfront_origin_access_identity" "this" {
  comment = "S3 CloudFront access ${aws_s3_bucket.proxy_config.id}"
}

resource "aws_cloudfront_distribution" "distribution" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.deployment_name} - Proxy-Config"
  price_class     = var.cloudfront_price_class
  tags            = var.tags

  origin {
    domain_name = aws_s3_bucket.proxy_config.bucket_regional_domain_name
    origin_id   = local.s3_origin_id

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.this.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    # Allow connections via HTTP to improve speed
    viewer_protocol_policy = "allow-all"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
