output "static_upload_bucket_id" {
  value = module.statics_deploy.static_upload_bucket_id
}

output "cloudfront_domain_name" {
  description = "The domain of the main CloudFront distribution."
  value       = var.cloudfront_create_distribution ? module.cloudfront_main[0].cloudfront_domain_name : null
}

output "cloudfront_hosted_zone_id" {
  description = "The zone id of the main CloudFront distribution."
  value       = var.cloudfront_create_distribution ? module.cloudfront_main[0].cloudfront_hosted_zone_id : null
}
