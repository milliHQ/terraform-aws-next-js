#############
# Lambda@Edge
#############

variable "proxy_module_version" {
  type    = string
  default = "0.5.0"
}

# Note that Lambda@Edge currently does not support `nodejs14.x` runtime
# https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-requirements-limits.html#lambda-requirements-lambda-function-configuration
variable "lambda_default_runtime" {
  type    = string
  default = "nodejs12.x"
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
