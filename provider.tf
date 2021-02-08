# AWS region for CloudFront and Lambda@Edge
provider "aws" {
  alias  = "global_region"
  region = "us-east-1"
}
