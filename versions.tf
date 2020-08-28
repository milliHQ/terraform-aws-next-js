terraform {
  required_version = ">= 0.12.6, < 0.14"

  required_providers {
    aws = ">= 2.67, < 4.0"
    random = "~> 2.3.0"
  }
}
