variable "static_files_archive" {
  type = string
}

variable "deploy_trigger_module_version" {
  type    = string
  default = "0.13.2"
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

variable "lambda_role_permissions_boundary" {
  type    = string
  default = null
}

variable "use_awscli_for_static_upload" {
  type    = bool
  default = false
}

###########
# SQS Queue
###########
variable "sqs_message_retention_seconds" {
  type    = number
  default = 86400
}

variable "sqs_receive_wait_time_seconds" {
  type    = number
  default = 10
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

#######
# Debug
#######
variable "debug_use_local_packages" {
  type    = bool
  default = false
}

variable "tf_next_module_root" {
  type = string
}
