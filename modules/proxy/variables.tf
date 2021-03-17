variable "api_gateway_endpoint" {
  type = string
}

variable "static_bucket_access_identity" {
  type = string
}

variable "static_bucket_endpoint" {
  type = string
}

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

variable "proxy_module_version" {
  type    = string
  default = "0.5.0"
}

variable "lambda_default_runtime" {
  type    = string
  default = "nodejs12.x"
}

variable "lambda_role_permissions_boundary" {
  type    = string
  default = null
}

############
# CloudFront
############
variable "cloudfront_price_class" {
  type = string
}
variable "cloudfront_origins" {
  type    = list(any)
  default = null
}

variable "cloudfront_custom_behaviors" {
  type    = list(any)
  default = null
}

variable "cloudfront_alias_domains" {
  type    = list(string)
  default = []
}

variable "cloudfront_viewer_certificate_arn" {
  type    = string
  default = null
}

variable "cloudfront_minimum_protocol_version" {
  type = string
}

variable "cloudfront_origin_request_policy_id" {
  type = string
}

variable "cloudfront_cache_policy_id" {
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

#######
# Debug
#######
variable "debug_use_local_packages" {
  type    = bool
  default = false
}
