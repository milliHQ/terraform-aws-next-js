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
}

variable "proxy_config_json" {
  type = string
}

variable "proxy_module_version" {
  type    = string
  default = "0.3.0"
}

variable "debug_use_local_packages" {
  type    = bool
  default = false
}

variable "lambda_default_runtime" {
  type    = string
  default = "nodejs12.x"
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

variable "tags" {
  type    = map(string)
  default = {}
}
