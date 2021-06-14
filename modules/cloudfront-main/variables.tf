############
# CloudFront
############

variable "cloudfront_price_class" {
  type = string
}

variable "cloudfront_default_root_object" {
  type = string
}

variable "cloudfront_origins" {
  type    = any
  default = null
}

variable "cloudfront_default_behavior" {
  type    = any
  default = null
}

variable "cloudfront_ordered_cache_behaviors" {
  type    = any
  default = null
}

variable "cloudfront_custom_error_response" {
  type    = any
  default = null
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
