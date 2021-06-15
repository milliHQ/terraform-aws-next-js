#############
# Lambda@Edge
#############

variable "proxy_module_version" {
  type    = string
  default = "0.5.0"
}

variable "lambda_default_runtime" {
  type    = string
  default = "nodejs14.x"
}

variable "lambda_role_permissions_boundary" {
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
