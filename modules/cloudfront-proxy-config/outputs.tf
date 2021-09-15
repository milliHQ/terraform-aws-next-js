output "config_endpoint" {
  value = "${aws_cloudfront_distribution.distribution.domain_name}/${local.proxy_config_key}"
}

output "table_arn" {
  value = var.multiple_deployments ? aws_dynamodb_table.proxy_config[0].arn : null
}

output "table_name" {
  value = var.multiple_deployments ? aws_dynamodb_table.proxy_config[0].name : null
}
