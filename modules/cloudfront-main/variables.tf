############
# CloudFront
############

variable "cloudfront_price_class" {
  type = string
}

variable "cloudfront_aliases" {
  type    = list(string)
  default = []
}

variable "cloudfront_acm_certificate_arn" {
  type    = string
  default = null
}

variable "cloudfront_minimum_protocol_version" {
  type    = string
  default = "TLSv1"
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

variable "cloudfront_webacl_id" {
  description = "An optional webacl2 arn or webacl id to associate with the cloudfront distribution"
  type        = string
  default     = null
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
