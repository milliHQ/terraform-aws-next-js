# Changelog

## 0.5.1 (January 13, 2021)

### Terraform module

- Adds `cloudfront_hosted_zone_id` output ([#30](https://github.com/dealmore/terraform-aws-next-js/pull/30)).

## 0.5.0 (January 03, 2021)

Happy New Year! 🍾  
With this release we bring native support for [redirects](https://nextjs.org/docs/api-reference/next.config.js/redirects) in Next.js.

### Proxy (0.3.0)

- Adds ability to handle redirects ([#10](https://github.com/dealmore/terraform-aws-next-js/issues/10), [#24](https://github.com/dealmore/terraform-aws-next-js/pull/24)).

### tf-next (0.3.0)

- The build tool got a new name, now it is simply `tf-next` instead of `@dealmore/terraform-next-build`.  
  For backwards compatibility we plan to release new versions to both the old and the new package name until v1.0.

- When running `tf-next build` we now filter out routes with the prefix `_next/static/*` since they are handled directly by CloudFront and will never hit the Proxy.

## 0.4.0 (December 30, 2020)

- Adds [new example](https://github.com/dealmore/terraform-aws-next-js/blob/main/examples/custom-domain) how to use custom domains.

### Terraform module

- Adds ability to change the price class of the associated CloudFront distributions (`cloudfront_price_class`).
- Adds new option after how many days the static assets of previous deployments should be deleted from S3(`expire_static_assets`).
- Updates deploy trigger Lambda function to `v0.1.0`.

### Deploy trigger

- Static routes are now cached much longer by CloudFront.
- Static routes from CloudFront now get invalidated when a new deployment is pushed.
- Updates deploy trigger Lambda function to support expiration of previous deployments.

## 0.3.0 (December 23, 2020)

### Terraform module

- Adds support for Terraform `v0.14`
- Drops support for Terraform `v0.12`

## 0.2.0 (December 22, 2020)

> **Note:** This will be the last release with support for Terraform `v12.x`, see [#18](https://github.com/dealmore/terraform-aws-next-js/issues/18) for more information.

### Terraform module

- Destroy non-empty S3 buckets on stack deletion
- Experimental support for pre-Rendered routes ([#16](https://github.com/dealmore/terraform-aws-next-js/issues/16))

### Terraform Next Build

- Experimental support for pre-Rendered routes ([#16](https://github.com/dealmore/terraform-aws-next-js/issues/16))

### Proxy

- Experimental support for pre-Rendered routes ([#16](https://github.com/dealmore/terraform-aws-next-js/issues/16))
