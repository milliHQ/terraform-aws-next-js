############
# CloudFront
############

variable "proxy_config_module_version" {
  type    = string
  default = "0.12.2"
}

variable "lambda_runtime" {
  type    = string
  default = "nodejs14.x"
}

variable "lambda_role_permissions_boundary" {
  type    = string
  default = null
}

variable "cloudfront_price_class" {
  type = string
}

###################
# Deployment Bucket
###################

variable "static_deploy_bucket_region" {
  type = string
}

variable "static_deploy_bucket_arn" {
  type = string
}

variable "static_deploy_bucket_id" {
  type = string
}

##########
# DynamoDB
##########

variable "dynamodb_region" {
  type = string
}

variable "dynamodb_table_aliases_arn" {
  type = string
}

variable "dynamodb_table_aliases_name" {
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

variable "tf_next_module_root" {
  type = string
}
