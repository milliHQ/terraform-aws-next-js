# This module is based on the terraform-aws-lambda module:
# https://github.com/terraform-aws-modules/terraform-aws-lambda
#
# See the LICENSE file in the directory of this module for more information.
#
# It simplifies the available options for configuration to match the needs of
# this project.

terraform {
  required_version = ">= 0.13"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 3.0"
    }
  }
}
