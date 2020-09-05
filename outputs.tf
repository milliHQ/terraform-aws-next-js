output "static_upload_bucket_id" {
  value = module.statics_deploy.static_upload_bucket_id
}

output "cloudfront_domain_name" {
  description = "The domain of the main CloudFront distribution."
  value       = module.proxy.cloudfront_domain_name
}
