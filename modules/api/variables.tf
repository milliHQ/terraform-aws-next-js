variable "tf_next_module_root" {
  type = string
}

variable "api_component_version" {
  type    = string
  default = "1.0.0-canary.5"
}

##########
# Database
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

variable "dynamodb_table_deployments_arn" {
  type = string
}

variable "dynamodb_table_deployments_name" {
  type = string
}

###############
# Upload Bucket
###############

variable "upload_bucket_id" {
  type = string
}

variable "upload_bucket_region" {
  type = string
}

variable "upload_bucket_arn" {
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
