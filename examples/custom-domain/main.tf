# Assuming that the ZONE of your domain is already registrated to your AWS account (Route 53)
# https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

locals {
  # Your custom domain
  custom_domain = "example.com"
}

# Get the hosted zone for the custom domain
data "aws_route53_zone" "custom_domain_zone" {
  name = "${local.custom_domain}."
}

# Create a free SSL certificate for CloudFront distribution
# For more options (e.g. multiple domains) see:
# https://registry.terraform.io/modules/terraform-aws-modules/acm/aws/
module "cloudfront_cert" {
  source  = "terraform-aws-modules/acm/aws"
  version = "~> v2.0"

  domain_name = local.custom_domain
  zone_id     = data.aws_route53_zone.custom_domain_zone.zone_id

  tags = {
    Name = "CloudFront ${local.custom_domain}"
  }
}

module "tf_next" {
  source = "dealmore/next-js/aws"

  deployment_name = "Custom Domain Example ${local.custom_domain}"

  # You can also attach multiple domains here since it accepts an array
  # Keep in mind that `domain_names` & `domain_zone_names` should always
  # contain the same number of elements, because a domain uses the same index
  # to get the associated zone_id
  # e.g. domain_names[0] -> domain_zone_names[0]
  #      domain_names[1] -> domain_zone_names[1]
  #      etc.
  domain_names      = [local.custom_domain]
  domain_zone_names = [data.aws_route53_zone.custom_domain_zone.zone_id]

  # Tell CloudFront to use our created certificate
  cloudfront_viewer_certificate_arn = module.cloudfront_cert.this_acm_certificate_arn

}

output "cloudfront_domain_name" {
  value = module.tf_next.cloudfront_domain_name
}

output "custom_domain_name" {
  value = local.custom_domain
}
