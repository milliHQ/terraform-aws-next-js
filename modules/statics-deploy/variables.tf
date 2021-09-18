variable "static_files_archive" {
  type = string
}

variable "static_files_archive_name" {
  type = string
}

variable "deploy_trigger_module_version" {
  type    = string
  default = "0.4.0"
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

variable "multiple_deployments" {
  description = "Have multiple deployments and domain aliases."
  type        = bool
  default     = false
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

#####################
# Deployment creation
#####################
variable "lambda_attach_to_vpc" {
  type        = bool
  description = "Set to true if the Lambda functions should be attached to a VPC. Use this setting if VPC resources should be accessed by the Lambda functions. When setting this to true, use vpc_security_group_ids and vpc_subnet_ids to specify the VPC networking. Note that attaching to a VPC would introduce a delay on to cold starts"
  default     = false
}

variable "vpc_subnet_ids" {
  type        = list(string)
  description = "The list of VPC subnet IDs to attach the Lambda functions. lambda_attach_to_vpc should be set to true for these to be applied."
  default     = []
}

variable "vpc_security_group_ids" {
  type        = list(string)
  description = "The list of Security Group IDs to be used by the Lambda functions. lambda_attach_to_vpc should be set to true for these to be applied."
  default     = []
}

variable "lambda_environment_variables" {
  type        = map(string)
  description = "Map that defines environment variables for the Lambda Functions in Next.js."
  default     = {}
}

variable "proxy_config_table_name" {
  description = "Name of the DynamoDB table to store proxy configurations."
  type        = string
  default     = "tf-next-proxy-config"
}

variable "proxy_config_table_arn" {
  description = "ARN of the DynamoDB table to store proxy configurations."
  type        = string
}

variable "proxy_config_bucket_name" {
  description = "Name of the S3 bucket to store proxy configurations."
  type        = string
  default     = "next-tf-proxy-config"
}

variable "proxy_config_bucket_arn" {
  description = "ARN of the S3 bucket to store proxy configurations."
  type        = string
}

variable "lambda_logging_policy_arn" {
  description = "ARN of the lambda logging policy."
  type        = string
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
