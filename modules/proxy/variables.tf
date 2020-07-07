variable "api_gateway_endpoint" {
  type = string
}

variable "static_bucket_access_identity" {
  type = string
}

variable "static_bucket_endpoint" {
  type = string
}

variable "cloudfront_price_class" {
  type    = string
  default = "PriceClass_100"
}

variable "proxy_config_json" {
  type = string
}

variable "proxy_module_version" {
  type    = string
  default = "0.0.3"
}

variable "debug_use_local_packages" {
  type    = bool
  default = false
}

variable "lambda_default_runtime" {
  type = string
}

variable "deployment_name" {
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
