terraform {
  required_version = ">= 0.15"

  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 3.43.0"
      configuration_aliases = [aws.global_region]
    }

    random = {
      source  = "hashicorp/random"
      version = ">= 2.3.0"
    }
  }
}
