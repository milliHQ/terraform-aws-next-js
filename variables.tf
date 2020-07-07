variable "next_tf_dir" {
  type        = string
  description = "Relative path to the .next-tf dir"
  default     = "./.next-tf"
}

variable "deployment_name" {
  type        = string
  description = "Identifier for the deployment group (Added to Comments)"
  default     = "Terraform-next.js"
}

########
# Lambda
########

variable "lambda_environment_variables" {
  description = "A map that defines environment variables for the Lambda Functions in Next.js."
  type        = map(string)
  default     = {}
}

#########################
# Cloudfront Distribution
#########################

variable "cloudfront_origins" {
  type    = list(any)
  default = null
}

variable "cloudfront_custom_behaviors" {
  type    = list(any)
  default = null
}

################
# Debug Settings
################

variable "debug_use_local_packages" {
  type    = bool
  default = false
}
