variable "tf_next_module_root" {
  type = string
}

variable "deploy_controller_component_version" {
  type    = string
  default = "1.0.0-canary.4"
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
