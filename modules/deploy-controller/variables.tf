variable "tf_next_module_root" {
  type = string
}

variable "deploy_controller_component_version" {
  type    = string
  default = "0.12.2"
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
