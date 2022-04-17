############
# CloudFront
############

variable "cloudfront_price_class" {
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

variable "tags_s3_bucket" {
  type    = map(string)
  default = {}
}
