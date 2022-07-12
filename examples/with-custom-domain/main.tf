terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
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

###########
# Locals
###########

locals {
  aliases = [var.custom_domain]
  # If you need a wildcard domain(ex: *.example.com), you can add it like this:
  # aliases = [var.custom_domain, "*.${var.custom_domain}"]
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
  for_each = toset(local.aliases)

  zone_id = data.aws_route53_zone.custom_domain_zone.zone_id
  name    = each.key
  type    = "A"

  alias {
    name                   = module.tf_next.cloudfront_domain_name
    zone_id                = module.tf_next.cloudfront_hosted_zone_id
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

  domain_name               = var.custom_domain
  zone_id                   = data.aws_route53_zone.custom_domain_zone.zone_id
  subject_alternative_names = slice(local.aliases, 1, length(local.aliases))

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
  source  = "milliHQ/next-js/aws"
  version = "1.0.0-canary.5"

  cloudfront_aliases             = local.aliases
  cloudfront_acm_certificate_arn = module.cloudfront_cert.acm_certificate_arn

  deployment_name = "tf-next-example-custom-domain"
  providers = {
    aws.global_region = aws.global_region
  }

  # Uncomment when using in the cloned monorepo for tf-next development
  # source = "../.."
  # debug_use_local_packages = true
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
