# CloudFront requires that the distribution resource is created in us-east-1
provider "aws" {
  region = "us-east-1"
}
