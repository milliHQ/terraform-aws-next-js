terraform {
  required_version = ">= 0.15"

  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 4.8"
      configuration_aliases = [aws.global_region]
    }
  }
}
