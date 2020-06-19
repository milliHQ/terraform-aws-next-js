provider "aws" {
  version = "~> 2.0"
}

resource "aws_s3_bucket" "uploads" {
  acl = "private"
}
