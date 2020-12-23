terraform {
  required_version = ">= 0.13"

  required_providers {
    external = {
      source  = "hashicorp/external"
      version = ">= 1.2.0"
    }
    http = {
      source  = "hashicorp/http"
      version = ">= 1.2.0"
    }
    local = {
      source  = "hashicorp/local"
      version = ">= 1.4.0"
    }
  }
}
