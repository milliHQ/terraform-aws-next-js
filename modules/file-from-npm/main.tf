locals {
  node_resolve_script = <<-EOF
    console.log(
      JSON.stringify({
        path: require.resolve("${var.module_name}/${var.path_to_file}")
      })
    );
  EOF

  cdn_provider_url   = "https://cdn.jsdelivr.net/npm/"
  cdn_module_version = length(var.module_version) > 0 ? "@${var.module_version}" : ""
  cdn_module_url     = "${local.cdn_provider_url}${var.module_name}${local.cdn_module_version}/${var.path_to_file}"
  cdn_download_dest  = "${path.module}/download/${var.module_name}/${var.path_to_file}"

  file_path = var.use_local ? data.external.this[0].result.path : local.cdn_download_dest
}

#######################################
# Find file locally via node.js resolve
#######################################

data "external" "this" {
  count = var.use_local ? 1 : 0

  program     = ["node", "-e", local.node_resolve_script]
  working_dir = path.cwd
}

############################
# Download the file from CDN
############################

data "external" "jsdeliver" {
  count = var.use_local ? 0 : 1

  program = ["bash", "${path.module}/download.sh", local.cdn_module_url, local.cdn_download_dest]
}
