###############
# Lambda Source
###############

variable "module_name" {
  description = "Name of the package that should be downloaded from npm."
  type        = string
}

variable "module_version" {
  description = "Version of the module that should be fetched from npm registry."
  type        = string
}

variable "module_asset_path" {
  description = "Path of the asset that should be used from the npm package."
  type        = string
  default     = "dist.zip"
}

variable "local_cwd" {
  description = "Root path where node.resolve should start looking for the local module."
}

########
# Lambda
########

variable "function_name" {
  description = "Name of the Lambda function."
  type        = string
}

variable "description" {
  description = "Description that should be added to the function."
  type        = string
}

variable "runtime" {
  description = "Runtime that the function should use."
  type        = string
  default     = "nodejs14.x"
}

variable "memory_size" {
  description = "Amount of memory that should be allocated by the function."
  type        = number
  default     = 128
}

variable "handler" {
  description = "Entry point of the function that should be called on execution"
  type        = string
}

variable "allowed_triggers" {
  description = "Map of allowed triggers to create Lambda permissions."
  type        = map(any)
  default     = {}
}

###########
# Log Group
###########

variable "cloudwatch_logs_retention_in_days" {
  description = "Amount of days you want to retain log events of the function."
  type        = number
  default     = 30
}

##########
# Labeling
##########

variable "tags" {
  type    = map(string)
  default = {}
}

#######
# Debug
#######

variable "debug_use_local_packages" {
  description = "Instead of downloading the package content from the npm registry, resolve locally."
  type        = bool
  default     = false
}
