terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

# Main region where the resources should be created in
# Should be close to the location of your viewers
provider "aws" {
  region = "us-west-2"
}

# Provider used for creating the Lambda@Edge function which must be deployed
# to us-east-1 region (Should not be changed)
provider "aws" {
  alias  = "global_region"
  region = "us-east-1"
}

###########
# Variables
###########

variable "custom_domain" {
  description = "Your custom domain"
  type        = string
  default     = "example.com"
}

# Assuming that the ZONE of your domain is already registrated in your AWS account (Route 53)
# https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html
variable "custom_domain_zone_name" {
  description = "The Route53 zone name of the custom domain"
  type        = string
  default     = "example.com."
}


#######################
# Route53 Domain record
#######################

# Get the hosted zone for the custom domain
data "aws_route53_zone" "custom_domain_zone" {
  name = var.custom_domain_zone_name
}

# Create a new record in Route 53 for the domain
resource "aws_route53_record" "cloudfront_alias_domain" {
  zone_id = data.aws_route53_zone.custom_domain_zone.zone_id
  name    = var.custom_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.distribution.domain_name
    zone_id                = aws_cloudfront_distribution.distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

##########
# SSL Cert
##########

# Creates a free SSL certificate for CloudFront distribution
# For more options (e.g. multiple domains) see:
# https://registry.terraform.io/modules/terraform-aws-modules/acm/aws/
module "cloudfront_cert" {
  source  = "terraform-aws-modules/acm/aws"
  version = "~> 3.0"

  domain_name = var.custom_domain
  zone_id     = data.aws_route53_zone.custom_domain_zone.zone_id

  tags = {
    Name = "CloudFront ${var.custom_domain}"
  }

  # CloudFront works only with certs stored in us-east-1
  providers = {
    aws = aws.global_region
  }
}

##########################
# Terraform Next.js Module
##########################

module "tf_next" {
  source = "dealmore/next-js/aws"

  # Prevent creation of the main CloudFront distribution
  cloudfront_create_distribution = false
  cloudfront_external_id         = aws_cloudfront_distribution.distribution.id
  cloudfront_external_arn        = aws_cloudfront_distribution.distribution.arn

  deployment_name = "terraform-next-js-example-custom-domain"
  providers = {
    aws.global_region = aws.global_region
  }

  # Uncomment when using in the cloned monorepo for tf-next development
  # source = "../.."
  # debug_use_local_packages = true
}

#########################
# CloudFront distribution
#########################

# You can fully customize all the settings of the CloudFront distribution
# as described in the AWS Provider documentation:
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
resource "aws_cloudfront_distribution" "distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "terraform-next-js-example-custom-domain"
  aliases             = [var.custom_domain]
  default_root_object = module.tf_next.cloudfront_default_root_object

  # Default cache behavior
  ########################
  # Inserts the preconfigured default cache behavior from the tf-next module
  # No manual edits should be neccessary here
  dynamic "default_cache_behavior" {
    for_each = module.tf_next.cloudfront_default_cache_behavior

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

  # Ordered cache behaviors
  #########################
  # Inserts the preconfigured ordered cache behaviors from the tf-next module
  # No manual edits should be neccessary here
  dynamic "ordered_cache_behavior" {
    for_each = module.tf_next.cloudfront_ordered_cache_behaviors

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

  # Origins
  #########
  # Adds the preconfigured origins from the tf-next module
  # No manual edits should be neccessary here
  dynamic "origin" {
    for_each = module.tf_next.cloudfront_origins

    content {
      domain_name = origin.value["domain_name"]
      origin_id   = origin.value["origin_id"]

      # Origin Shield
      dynamic "origin_shield" {
        for_each = lookup(origin.value, "origin_shield", null) != null ? [true] : []

        content {
          enabled              = lookup(origin.value["origin_shield"], "enabled", false)
          origin_shield_region = lookup(origin.value["origin_shield"], "origin_shield_region", null)
        }
      }

      # S3 origin
      dynamic "s3_origin_config" {
        for_each = lookup(origin.value, "s3_origin_config", null) != null ? [true] : []
        content {
          origin_access_identity = lookup(origin.value["s3_origin_config"], "origin_access_identity", null)
        }
      }

      # Custom origin
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
        for_each = lookup(origin.value, "custom_header", null) != null ? origin.value["custom_header"] : []

        content {
          name  = custom_header.value["name"]
          value = custom_header.value["value"]
        }
      }
    }
  }

  # Custom Error response (S3 failover)
  #####################################
  # Adds the preconfigured custom error response from the tf-next module
  # No manual edits should be neccessary here
  dynamic "custom_error_response" {
    for_each = module.tf_next.cloudfront_custom_error_response

    content {
      error_caching_min_ttl = custom_error_response.value["error_caching_min_ttl"]
      error_code            = custom_error_response.value["error_code"]
      response_code         = custom_error_response.value["response_code"]
      response_page_path    = custom_error_response.value["response_page_path"]
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = false
    acm_certificate_arn            = module.cloudfront_cert.acm_certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

#########
# Outputs
#########

output "cloudfront_domain_name" {
  value = module.tf_next.cloudfront_domain_name
}

output "custom_domain_name" {
  value = var.custom_domain
}
