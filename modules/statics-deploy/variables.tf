variable "deploy_trigger_module_version" {
  type    = string
  default = "1.0.0-canary.5"
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

################
# CloudFormation
################

variable "cloudformation_role_arn" {
  description = "Role ARN that should be assigned to the CloudFormation substacks created by CDK."
  type        = string
}

######################
# Multiple deployments
######################

variable "enable_multiple_deployments" {
  type = bool
}

variable "multiple_deployments_base_domain" {
  type    = string
  default = null
}

#####################
# Deployment database
#####################

variable "dynamodb_region" {
  type = string
}

variable "dynamodb_table_aliases_arn" {
  type = string
}

variable "dynamodb_table_aliases_name" {
  type = string
}

variable "dynamodb_table_deployments_arn" {
  type = string
}

variable "dynamodb_table_deployments_name" {
  type = string
}

#####
# SNS
#####

variable "deploy_status_sns_topic_arn" {
  description = "ARN of the SNS topic where CloudFormation status changes should be sent to."
  type        = string
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
