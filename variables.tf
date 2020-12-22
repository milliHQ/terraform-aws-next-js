variable "next_tf_dir" {
  description = "Relative path to the .next-tf dir."
  type        = string
  default     = "./.next-tf"
}

variable "deployment_name" {
  description = "Identifier for the deployment group (Added to Comments)."
  type        = string
  default     = "Terraform-next.js"
}

variable "domain_names" {
  description = "Alternative domain names for the CloudFront distribution."
  type        = list(string)
  default     = []
}

variable "create_domain_name_records" {
  description = "Controls whether Route 53 records for the for the domain_names should be created."
  type        = bool
  default     = true
}

variable "domain_zone_names" {
  type    = list(string)
  default = []
}

###################
# Lambdas (Next.js)
###################

variable "lambda_environment_variables" {
  type        = map(string)
  description = "A map that defines environment variables for the Lambda Functions in Next.js."
  default     = {}
}

variable "lambda_runtime" {
  description = "Lambda Function runtime"
  type        = string
  default     = "nodejs12.x"
}

variable "lambda_memory_size" {
  description = "Amount of memory in MB a Lambda Function can use at runtime. Valid value between 128 MB to 10,240 MB, in 1 MB increments."
  type        = number
  default     = 1024
}

variable "lambda_timeout" {
  description = "The max amount of time a Lambda Function has to return a response in seconds. Should not be more than 30 (Limited by API Gateway)."
  type        = number
  default     = 10
}

variable "lambda_policy_json" {
  description = "An additional policy document as JSON to attach to the Lambda Function role"
  type        = string
  default     = null
}

#########################
# Cloudfront Distribution
#########################

variable "cloudfront_viewer_certificate_arn" {
  type    = string
  default = null
}

variable "cloudfront_minimum_protocol_version" {
  description = "The minimum version of the SSL protocol that you want CloudFront to use for HTTPS connections. One of SSLv3, TLSv1, TLSv1_2016, TLSv1.1_2016, TLSv1.2_2018 or TLSv1.2_2019."
  type    = string
  default = "TLSv1.2_2019"
}

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
  description = "Use locally built packages rather than download them from npm."
  type        = bool
  default     = false
}
