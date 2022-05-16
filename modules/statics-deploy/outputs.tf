output "static_bucket_access_identity" {
  value = aws_cloudfront_origin_access_identity.this.cloudfront_access_identity_path
}

output "static_bucket_endpoint" {
  value = aws_s3_bucket.static_deploy.bucket_regional_domain_name
}

output "static_bucket_id" {
  value = aws_s3_bucket.static_deploy.id
}

output "static_bucket_region" {
  value = aws_s3_bucket.static_deploy.region
}

output "static_bucket_arn" {
  value = aws_s3_bucket.static_deploy.arn
}

###############
# Upload Bucket
###############

output "upload_bucket_id" {
  value = aws_s3_bucket.static_upload.id
}

output "upload_bucket_region" {
  value = aws_s3_bucket.static_upload.region
}

output "upload_bucket_arn" {
  value = aws_s3_bucket.static_upload.arn
}
