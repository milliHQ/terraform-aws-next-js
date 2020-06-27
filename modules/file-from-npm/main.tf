provider "external" {
  version = "~> 1.2.0"
}

locals {
  script = <<-EOF
    console.log(
      JSON.stringify({
        path: require.resolve("${var.module_name}/${var.path_to_file}")
      })
    );
  EOF
}

data "external" "this" {
  program     = ["node", "-e", "${local.script}"]
  working_dir = path.cwd
}
