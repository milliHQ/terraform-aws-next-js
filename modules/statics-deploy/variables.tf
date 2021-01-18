variable "static_files_archive" {
  type = string
}

variable "debug_use_local_packages" {
  type    = bool
  default = false
}

variable "deploy_trigger_module_version" {
  type    = string
  default = "0.1.0"
}

variable "expire_static_assets" {
  type = number
}

variable "cloudfront_id" {
  description = "The ID of the CloudFront distribution where the route invalidations should be sent to."
  type        = string
}

variable "cloudfront_arn" {
  description = "The ARN of the CloudFront distribution where the route invalidations should be sent to."
  type        = string
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "lambda_role_permissions_boundary" {
  type    = string
  default = null
}
