variable "next_tf_dir" {
  type        = string
  description = "Relative path to the .next-tf dir"
  default     = "./.next-tf"
}

variable "debug_use_local_packages" {
  type    = bool
  default = false
}
