locals {
  locate_proxy_script = <<-EOF
    console.log(
      JSON.stringify({
        path: require.resolve("@dealmore/terraform-next-proxy/dist.zip")
      })
    );
  EOF
}

data "external" "proxy_package" {
  program     = ["node", "-e", "${local.locate_proxy_script}"]
  working_dir = path.cwd
}


resource "random_id" "function_name" {
  prefix      = "next-tf-proxy-"
  byte_length = 4
}

module "edge_proxy" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 1.14.0"

  lambda_at_edge = true

  function_name = random_id.function_name.hex
  description   = "Managed by Terraform-next.js"
  handler       = "handler.handler"
  runtime       = "nodejs12.x"

  create_package         = false
  local_existing_package = data.external.proxy_package.result.path

  cloudwatch_logs_retention_in_days = 30
}

############
# CloudFront
############

locals {
  origin_id_api_gateway = "ApiGateway"
}

resource "aws_cloudfront_distribution" "distribution" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "Managed by Terraform-next.js"
  price_class     = "PriceClass_100"
  # aliases         = [var.domain_name]

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
      event_type   = "viewer-request"
      lambda_arn   = module.edge_proxy.this_lambda_function_qualified_arn
      include_body = false
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2018"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
