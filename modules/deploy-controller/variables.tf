variable "tf_next_module_root" {
  type = string
}

variable "deploy_controller_component_version" {
  type    = string
  default = "1.0.0-canary.5"
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
