output "upload_bucket_id" {
  value = module.statics_deploy.upload_bucket_id
}

output "api_endpoint" {
  description = "API endpoint that is used by the CLI."
  value       = module.api.api_endpoint
}

output "api_endpoint_access_policy_arn" {
  description = "ARN of the policy that grants access to the API endpoint."
  value       = module.api.api_endpoint_access_policy_arn
}

##################################
# Internal CloudFront distribution
##################################

output "cloudfront_domain_name" {
  description = "Domain of the main CloudFront distribution (When created)."
  value       = var.cloudfront_create_distribution ? module.cloudfront_main[0].cloudfront_domain_name : null
}

output "cloudfront_hosted_zone_id" {
  description = "Zone id of the main CloudFront distribution (When created)."
  value       = var.cloudfront_create_distribution ? module.cloudfront_main[0].cloudfront_hosted_zone_id : null
}

##################################
# External CloudFront distribution
##################################

output "cloudfront_default_root_object" {
  description = "Preconfigured root object the CloudFront distribution should use."
  value       = local.cloudfront_default_root_object
}

output "cloudfront_default_cache_behavior" {
  description = "Preconfigured default cache behavior the CloudFront distribution should use."
  value       = local.cloudfront_default_behavior
}

output "cloudfront_ordered_cache_behaviors" {
  description = "Preconfigured ordered cache behaviors the CloudFront distribution should use."
  value       = local.cloudfront_ordered_cache_behaviors
}

output "cloudfront_origins" {
  description = "Preconfigured origins the CloudFront distribution should use."
  value       = local.cloudfront_origins
}

output "cloudfront_custom_error_response" {
  description = "Preconfigured custom error response the CloudFront distribution should use."
  value       = local.cloudfront_custom_error_response
}
