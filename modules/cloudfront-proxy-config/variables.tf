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

variable "tags_s3_bucket" {
  type    = map(string)
  default = {}
}
