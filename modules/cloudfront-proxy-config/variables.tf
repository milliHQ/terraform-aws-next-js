##############
# Proxy Config
##############

variable "proxy_config_json" {
  type = string
}

variable "proxy_config_version" {
  type = number

  validation {
    condition     = var.proxy_config_version > 0
    error_message = "Your tf-next package is outdated. Run `npm update tf-next@latest` or `yarn upgrade tf-next@latest`."
  }
}

################
# DynamoDB Table
################

variable "multiple_deployments" {
  description = "Have multiple deployments and domain aliases."
  type        = bool
  default     = false
}

variable "proxy_config_table_name" {
  description = "Name of the DynamoDB table to store proxy configurations."
  type        = string
  default     = "tf-next-proxy-config"
}

############
# CloudFront
############

variable "cloudfront_price_class" {
  type = string
}


##########
# Labeling
##########

variable "deployment_name" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
