locals {
  # next-tf config
  config_dir           = trimsuffix(var.next_tf_dir, "/")
  config_file          = jsondecode(file("${local.config_dir}/config.json"))
  lambdas              = lookup(local.config_file, "lambdas", {})
  static_files_archive = "${local.config_dir}/${lookup(local.config_file, "staticFilesArchive", "")}"

  # Build the proxy config JSON
  config_file_images  = lookup(local.config_file, "images", {})
  config_file_version = lookup(local.config_file, "version", 0)
  static_routes_json  = lookup(local.config_file, "staticRoutes", [])
  routes_json         = lookup(local.config_file, "routes", [])
  lambda_routes_json = flatten([
    for integration_key, integration in local.lambdas : [
      lookup(integration, "route", "/")
    ]
  ])
  prerenders_json = lookup(local.config_file, "prerenders", {})
  proxy_config_json = jsonencode({
    routes       = local.routes_json
    staticRoutes = local.static_routes_json
    lambdaRoutes = local.lambda_routes_json
    prerenders   = local.prerenders_json
  })
}

#########
# Lambdas
#########

# Static deployment to S3 website and handles CloudFront invalidations
module "statics_deploy" {
  source = "./modules/statics-deploy"

  static_files_archive = local.static_files_archive
  expire_static_assets = var.expire_static_assets

  cloudfront_id  = var.cloudfront_create_distribution ? module.cloudfront_main[0].cloudfront_id : var.cloudfront_external_id
  cloudfront_arn = var.cloudfront_create_distribution ? module.cloudfront_main[0].cloudfront_arn : var.cloudfront_external_arn

  lambda_role_permissions_boundary = var.lambda_role_permissions_boundary
  use_awscli_for_static_upload     = var.use_awscli_for_static_upload

  deployment_name = var.deployment_name
  tags            = var.tags
  tags_s3_bucket  = var.tags_s3_bucket

  debug_use_local_packages = var.debug_use_local_packages
  tf_next_module_root      = path.module
}

# Lambda

resource "aws_lambda_function" "this" {
  for_each = local.lambdas

  function_name = "${var.deployment_name}_${each.key}"
  description   = "Managed by Terraform Next.js"
  role          = aws_iam_role.lambda[each.key].arn
  handler       = lookup(each.value, "handler", "")
  runtime       = lookup(each.value, "runtime", var.lambda_runtime)
  memory_size   = lookup(each.value, "memory", var.lambda_memory_size)
  timeout       = var.lambda_timeout
  tags          = var.tags

  filename         = "${local.config_dir}/${lookup(each.value, "filename", "")}"
  source_code_hash = filebase64sha256("${local.config_dir}/${lookup(each.value, "filename", "")}")

  dynamic "environment" {
    for_each = length(var.lambda_environment_variables) > 0 ? [true] : []
    content {
      variables = var.lambda_environment_variables
    }
  }

  dynamic "vpc_config" {
    for_each = var.lambda_attach_to_vpc ? [true] : []
    content {
      security_group_ids = var.vpc_security_group_ids
      subnet_ids         = var.vpc_subnet_ids
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_logs, aws_cloudwatch_log_group.this]
}

# Lambda invoke permission

resource "aws_lambda_permission" "current_version_triggers" {
  for_each = local.lambdas

  statement_id  = "AllowInvokeFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${var.deployment_name}_${each.key}"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${module.api_gateway.apigatewayv2_api_execution_arn}/*/*/*"
}

#############
# Api-Gateway
#############

locals {
  integrations_keys = flatten([
    for integration_key, integration in local.lambdas : [
      "ANY ${lookup(integration, "route", "")}/{proxy+}"
    ]
  ])
  integration_values = flatten([
    for integration_key, integration in local.lambdas : {
      lambda_arn             = aws_lambda_function.this[integration_key].arn
      payload_format_version = "2.0"
      timeout_milliseconds   = var.lambda_timeout * 1000
    }
  ])
  integrations = zipmap(local.integrations_keys, local.integration_values)
}

module "api_gateway" {
  source  = "terraform-aws-modules/apigateway-v2/aws"
  version = "1.1.0"

  name          = var.deployment_name
  description   = "Managed by Terraform Next.js"
  protocol_type = "HTTP"

  create_api_domain_name = false

  integrations = local.integrations

  tags = var.tags
}

############
# Next/Image
############

# Permission for image optimizer to fetch images from S3 deployment
data "aws_iam_policy_document" "access_static_deployment" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${module.statics_deploy.static_bucket_arn}/*"]
  }
}

module "next_image" {
  count = var.create_image_optimization ? 1 : 0

  source  = "milliHQ/next-js-image-optimization/aws"
  version = ">= 12.1.0"

  cloudfront_create_distribution = false

  # tf-next does not distinct between image and device sizes, because they
  # are eventually merged together on the image optimizer.
  # So we only use a single key (next_image_domains) to pass ALL (image &
  # device) sizes to the optimizer and by setting the other
  # (next_image_device_sizes) to an empty array which prevents the optimizer
  # from adding the default device settings
  next_image_domains                 = lookup(local.config_file_images, "domains", [])
  next_image_image_sizes             = lookup(local.config_file_images, "sizes", [])
  next_image_device_sizes            = []
  next_image_formats                 = lookup(local.config_file_images, "formats", null)
  next_image_dangerously_allow_SVG   = lookup(local.config_file_images, "dangerouslyAllowSVG", false)
  next_image_content_security_policy = lookup(local.config_file_images, "contentSecurityPolicy", null)

  source_bucket_id = module.statics_deploy.static_bucket_id

  lambda_memory_size               = var.image_optimization_lambda_memory_size
  lambda_attach_policy_json        = true
  lambda_policy_json               = data.aws_iam_policy_document.access_static_deployment.json
  lambda_role_permissions_boundary = var.lambda_role_permissions_boundary

  deployment_name = "${var.deployment_name}_tfn-image"
  tags            = var.tags
}

#########################
# CloudFront Proxy Config
#########################

module "proxy_config" {
  source = "./modules/cloudfront-proxy-config"

  cloudfront_price_class = var.cloudfront_price_class
  proxy_config_json      = local.proxy_config_json
  proxy_config_version   = local.config_file_version

  deployment_name = var.deployment_name
  tags            = var.tags
  tags_s3_bucket  = var.tags_s3_bucket
}

#####################
# Proxy (Lambda@Edge)
#####################

module "proxy" {
  source = "./modules/proxy"

  lambda_role_permissions_boundary = var.lambda_role_permissions_boundary

  deployment_name = var.deployment_name
  tags            = var.tags

  debug_use_local_packages = var.debug_use_local_packages
  tf_next_module_root      = path.module

  providers = {
    aws.global_region = aws.global_region
  }
}

#########################
# CloudFront distribution
#########################

# Origin & Cache Policies
#########################

# Managed origin policy for default behavior
data "aws_cloudfront_origin_request_policy" "managed_all_viewer" {
  name = "Managed-AllViewer"
}

# Managed origin policy for static assets
data "aws_cloudfront_origin_request_policy" "managed_cors_s3_origin" {
  name = "Managed-CORS-S3Origin"
}

# Managed cache policy
data "aws_cloudfront_cache_policy" "managed_caching_optimized" {
  name = "Managed-CachingOptimized"
}

locals {
  # Default headers on which the cache key should be determined
  #
  # host - When using multiple domains host header ensures that each
  #        (sub-)domain has a unique cache key
  cloudfront_cache_default_key_headers = ["host"]
  cloudfront_cache_key_headers = sort(concat(
    local.cloudfront_cache_default_key_headers,
    var.cloudfront_cache_key_headers
  ))
}

resource "aws_cloudfront_cache_policy" "this" {
  name    = "${var.deployment_name}_tfn-cache"
  comment = "Managed by Terraform Next.js"

  # Default values (Should be provided by origin)
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }

    headers_config {
      header_behavior = "whitelist"

      headers {
        items = local.cloudfront_cache_key_headers
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }

    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

locals {
  # CloudFront default root object
  ################################
  cloudfront_default_root_object = ""

  # CloudFront Origins
  ####################

  # Default origin (With config for Lambda@Edge Proxy)
  cloudfront_origin_static_content = {
    domain_name = module.statics_deploy.static_bucket_endpoint
    origin_id   = "tf-next-s3-static-content"

    s3_origin_config = {
      origin_access_identity = module.statics_deploy.static_bucket_access_identity
    }

    custom_header = [
      {
        name  = "x-env-config-endpoint"
        value = "http://${module.proxy_config.config_endpoint}"
      },
      {
        name  = "x-env-api-endpoint"
        value = trimprefix(module.api_gateway.apigatewayv2_api_api_endpoint, "https://")
      }
    ]
  }

  # Little hack here to create a dynamic object with different number of attributes
  # using filtering: https://www.terraform.io/docs/language/expressions/for.html#filtering-elements
  _cloudfront_origins = {
    static_content = merge(local.cloudfront_origin_static_content, { create = true })
    next_image = merge(
      var.create_image_optimization ? module.next_image[0].cloudfront_origin : null, {
        create = var.create_image_optimization
    })
  }

  cloudfront_origins = {
    for key, origin in local._cloudfront_origins : key => origin
    if origin.create
  }

  # CloudFront behaviors
  ######################

  # Default CloudFront behavior
  # (Lambda@Edge Proxy)
  cloudfront_default_behavior = {
    default_behavior = {
      allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods   = ["GET", "HEAD"]
      target_origin_id = local.cloudfront_origin_static_content.origin_id

      compress               = true
      viewer_protocol_policy = "redirect-to-https"

      origin_request_policy_id   = var.cloudfront_origin_request_policy != null ? var.cloudfront_origin_request_policy : data.aws_cloudfront_origin_request_policy.managed_all_viewer.id
      response_headers_policy_id = var.cloudfront_response_headers_policy
      cache_policy_id            = aws_cloudfront_cache_policy.this.id

      lambda_function_association = {
        event_type   = "origin-request"
        lambda_arn   = module.proxy.lambda_edge_arn
        include_body = false
      }
    }
  }

  # Next.js static assets behavior
  cloudfront_ordered_cache_behavior_static_assets = {
    path_pattern     = "/_next/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.cloudfront_origin_static_content.origin_id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.managed_cors_s3_origin.id
    cache_policy_id          = data.aws_cloudfront_cache_policy.managed_caching_optimized.id
  }

  # next/image behavior
  cloudfront_ordered_cache_behavior_next_image = var.create_image_optimization ? module.next_image[0].cloudfront_cache_behavior : null

  # Little hack here to create a dynamic object with different number of attributes
  # using filtering: https://www.terraform.io/docs/language/expressions/for.html#filtering-elements
  _cloudfront_ordered_cache_behaviors = {
    static_assets = merge(local.cloudfront_ordered_cache_behavior_static_assets, { create = true })
    next_image = merge(local.cloudfront_ordered_cache_behavior_next_image, {
      create = var.create_image_optimization
    })
  }

  cloudfront_ordered_cache_behaviors = {
    for key, behavior in local._cloudfront_ordered_cache_behaviors : key => behavior
    if behavior.create
  }

  cloudfront_custom_error_response = {
    s3_failover = {
      error_caching_min_ttl = 60
      error_code            = 403
      response_code         = 404
      response_page_path    = "/404"
    }
  }
}

module "cloudfront_main" {
  count = var.cloudfront_create_distribution ? 1 : 0

  source = "./modules/cloudfront-main"

  cloudfront_price_class              = var.cloudfront_price_class
  cloudfront_aliases                  = var.cloudfront_aliases
  cloudfront_acm_certificate_arn      = var.cloudfront_acm_certificate_arn
  cloudfront_minimum_protocol_version = var.cloudfront_minimum_protocol_version
  cloudfront_webacl_id                = var.cloudfront_webacl_id

  cloudfront_default_root_object     = local.cloudfront_default_root_object
  cloudfront_origins                 = local.cloudfront_origins
  cloudfront_default_behavior        = local.cloudfront_default_behavior
  cloudfront_ordered_cache_behaviors = local.cloudfront_ordered_cache_behaviors
  cloudfront_custom_error_response   = local.cloudfront_custom_error_response

  deployment_name = var.deployment_name
  tags            = var.tags
}
