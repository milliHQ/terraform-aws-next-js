variable "static_files_archive" {
  type = string
}

variable "debug_use_local_packages" {
  type    = bool
  default = false
}

variable "deploy_trigger_module_version" {
  type    = string
  default = "0.0.4"
}
