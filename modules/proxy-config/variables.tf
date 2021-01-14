variable "cloudfront_price_class" {
  type = string
}

variable "proxy_config_json" {
  type = string
}

variable "deployment_name" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
