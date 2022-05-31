# Changelog

## [Unreleased]

## [0.13.2] - 2022-05-31

- Fixes a regression from the `0.13.1` release, where the `@vercel/nft` was not available ([#322](https://github.com/milliHQ/terraform-aws-next-js/pull/322))

## [0.13.1] - 2022-05-30

- Update `@vercel/nft` from 0.10.0 to 0.19.1 ([#320](https://github.com/milliHQ/terraform-aws-next-js/pull/320))

## [0.13.0] - 2022-05-28

- Adds support for nodejs16.x runtime ([#318](https://github.com/milliHQ/terraform-aws-next-js/pull/318), [#316](https://github.com/milliHQ/terraform-aws-next-js/issues/316), [#315](https://github.com/milliHQ/terraform-aws-next-js/issues/315))
- Increases minimum required Terraform AWS provider version from `4.8` to `4.15.0`

## [0.12.2] - 2022-04-16

- Append querystring to redirects ([#296](https://github.com/milliHQ/terraform-aws-next-js/issues/296), [#304](https://github.com/milliHQ/terraform-aws-next-js/pull/304))

## [0.12.1] - 2022-04-11

- Pass image settings to the optimization module ([#297](https://github.com/milliHQ/terraform-aws-next-js/issues/297), [#299](https://github.com/milliHQ/terraform-aws-next-js/pull/299))

## [0.12.0] - 2022-04-07

- Ensure compatibility with AWS Provider Version 4 ([#286](https://github.com/milliHQ/terraform-aws-next-js/issues/286), [#291](https://github.com/milliHQ/terraform-aws-next-js/pull/291))
- Add switch for attaching additional policy documents ([#276](https://github.com/milliHQ/terraform-aws-next-js/pull/276))

## [0.11.5] - 2022-04-02

- Adds support for route-manifest v4 ([#292](https://github.com/milliHQ/terraform-aws-next-js/pull/292))  
  This ensures the builder works with Next.js versions `>= v12.1.3`.
- Restrict [image optimizer](https://github.com/milliHQ/terraform-aws-next-js-image-optimization) submodule version to `<= v12.0.10` ([#293](https://github.com/milliHQ/terraform-aws-next-js/pull/293))  
  Since the `v12.0.10` release is the last version with support for [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/) `v3.x` this update ensures existing setups will not break in the future.
- Bump @vercel/build-utils from `2.10.1` to `2.12.1` ([#287](https://github.com/milliHQ/terraform-aws-next-js/pull/287))

## [0.11.4] - 2022-02-01

### Fixed

- Determine content-type correctly for localized pre-rendered HTML pages ([#278](https://github.com/milliHQ/terraform-aws-next-js/pull/278), [#277](https://github.com/milliHQ/terraform-aws-next-js/issues/277))

## [0.11.3] - 2022-01-30

### Added

- Adds new output for Lambda role ARNs `lambda_execution_role_arns` ([#270](https://github.com/milliHQ/terraform-aws-next-js/pull/270))

## [0.11.2] - 2022-01-23

### Added

- Support for response headers policy (`cloudfront_response_headers_policy`) for the internal CloudFront distribution ([#265](https://github.com/milliHQ/terraform-aws-next-js/pull/265), [#268](https://github.com/milliHQ/terraform-aws-next-js/pull/268))  
  This also increases the minimum required [Terraform AWS provider](https://github.com/hashicorp/terraform-provider-aws) version from `3.43.0` to `3.64.0`.

### Fixed

- Bash script for uploading assets to S3 now uses the standard endpoint and is now compatible with newer AWS regions ([#263](https://github.com/milliHQ/terraform-aws-next-js/pull/263))
- Components fetched from npm registry now use relative paths that are stored in the Terraform state, which prevents unnecessary deployments ([#261](https://github.com/milliHQ/terraform-aws-next-js/pull/261))

## [0.11.1] - 2022-01-15

### Fixed

- Fix for cloudfront invalidation dynamic routing paths ([#258](https://github.com/milliHQ/terraform-aws-next-js/pull/258))

## [0.11.0] - 2022-01-13

### Added

- Option for attaching a waf policy to the internal CloudFront distribution ([#250](https://github.com/milliHQ/terraform-aws-next-js/pull/250))

### Changed

- TTL for `Cache-Control` header is set to `0` (no cache) when the header is not sent from origin ([#241](https://github.com/milliHQ/terraform-aws-next-js/pull/241), [#236](https://github.com/milliHQ/terraform-aws-next-js/issues/236))

### Fixed

- Static routes were falsely generated when running on Windows ([#246](https://github.com/milliHQ/terraform-aws-next-js/issues/246), [#254](https://github.com/milliHQ/terraform-aws-next-js/pull/254))

## [0.10.2] (November 29, 2021)

Bugfix release that ensures compatibility with the `v12.0.0` version of the [Terraform Next.js Image Optimization module for AWS](https://github.com/milliHQ/terraform-aws-next-js-image-optimization).

- `create_image_optimization` breaks because of breaking change in the newest 12.0.0 release ([#243](https://github.com/milliHQ/terraform-aws-next-js/issues/243), [#244](https://github.com/milliHQ/terraform-aws-next-js/pull/244))

## 0.10.1 (October 23, 2021)

This release ensures that static generated routes with dynamic parts (e.g. `/test/[...slug]`) are invalidated correctly when running terraform apply.
We also added a new option to define tags exclusively on S3 buckets created by this module.

- Ensure correct invalidation for slug paths ([#140](https://github.com/milliHQ/terraform-aws-next-js/issues/140), [#229](https://github.com/milliHQ/terraform-aws-next-js/pull/229), [#228](https://github.com/milliHQ/terraform-aws-next-js/issues/228))
- Adds new input variable `tags_s3_bucket` ([#216](https://github.com/milliHQ/terraform-aws-next-js/issues/216), [#230](https://github.com/milliHQ/terraform-aws-next-js/pull/230))

## 0.10.0 (October 16, 2021)

Beginning with this release we streamline the versioning of the Terraform module with its npm-packages.
So when you use the Terraform module in version [`0.10.0`](https://registry.terraform.io/modules/milliHQ/next-js/aws/) you should also use the [`tf-next@0.10.0`](https://www.npmjs.com/package/tf-next) npm-package for building the Next.js project.

This release also increases the minimum required Terraform version from `0.13` to `0.15`.

- Forward correct `host` header to server-side rendered pages ([#156](https://github.com/milliHQ/terraform-aws-next-js/issues/156), [#161](https://github.com/milliHQ/terraform-aws-next-js/pull/161))
- Adds charset to `Content-Type` header for static routes and files served by S3 ([#214](https://github.com/milliHQ/terraform-aws-next-js/issues/214), [#226](https://github.com/milliHQ/terraform-aws-next-js/pull/226))
- Removes empty provider warning when running Terraform commands ([#155](https://github.com/milliHQ/terraform-aws-next-js/issues/155), [#219](https://github.com/milliHQ/terraform-aws-next-js/pull/219))
- Removes random ids from resource names ([#212](https://github.com/milliHQ/terraform-aws-next-js/issues/212), [#227](https://github.com/milliHQ/terraform-aws-next-js/pull/227))

## 0.9.3 (October 09, 2021)

This release fixes the routing behavior for dynamic routes that are statically generated (served from S3).

### Proxy

- Fixes dynamic routing for statically generated routes ([#218](https://github.com/milliHQ/terraform-aws-next-js/issues/218), [#221](https://github.com/milliHQ/terraform-aws-next-js/pull/221))

## 0.9.2 (September 19, 2021)

⚠️ Namespace changed ⚠️

We [recently changed](https://github.com/milliHQ/terraform-aws-next-js/issues/194) the namespace of this module from `dealmore` to `milliHQ`. Make sure to upgrade the source of the module accordingly:

```diff
module "tf_next" {
-  source = "dealmore/next-js/aws"
+  source = "milliHQ/next-js/aws"

 ...
}
```

---

Besides from the namespace change, this release has now an improved experience when using it with [custom domains](https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/with-custom-domain) and some bugfixes to the proxy component when using the [`trailingSlash` option](https://nextjs.org/docs/api-reference/next.config.js/trailing-slash) from Next.js.

### Terraform module

- It's now possible to use domain aliases without creating an external CloudFront distribution ([#192](https://github.com/milliHQ/terraform-aws-next-js/pull/192))
- Ensure `x-nextjs-page` header gets forwarded ([#190](https://github.com/milliHQ/terraform-aws-next-js/pull/190))
- Bump `milliHQ/download/npm` from 1.1.0 to 2.0.0 ([#193](https://github.com/milliHQ/terraform-aws-next-js/pull/193))

### Proxy (0.8.0)

- Improve filesystem routes for trailing slashes ([#162](https://github.com/milliHQ/terraform-aws-next-js/pull/162), [#180](https://github.com/milliHQ/terraform-aws-next-js/issues/180), [#182](https://github.com/milliHQ/terraform-aws-next-js/pull/182), [#191](https://github.com/milliHQ/terraform-aws-next-js/pull/191))

## 0.9.1 (June 20, 2021)

This is a maintenance release which upgrades the image optimizer module to the latest version.
We also changed the behavior of the proxy module so that the default root object in CloudFront is no longer necessary.

No configuration changes should be necessary when upgrading from the `0.9.0` release.

### Terraform module

- Upgrades Proxy component to 0.7.0 ([#139](https://github.com/milliHQ/terraform-aws-next-js/issues/139), [#141](https://github.com/milliHQ/terraform-aws-next-js/pull/141))
- Upgrades [Terraform Next.js Image Optimization module for AWS](https://github.com/milliHQ/terraform-aws-next-js-image-optimization) to `11.x.x` release ([#142](https://github.com/milliHQ/terraform-aws-next-js/issues/142), [#144](https://github.com/milliHQ/terraform-aws-next-js/pull/144))  
  The image optimizer Lambda now uses `2048mb` RAM by default (from `1024mb`) to improve resizing speed.
  You can change that amount with the newly introduced variable `image_optimization_lambda_memory_size`.
  This has no effect on the Lambda functions that serve the Next.js pages or api routes (they remain at `1024mb` by default).
- Bump AWS Lambda Terraform module from 1.47.0 to 2.4.0 ([#145](https://github.com/milliHQ/terraform-aws-next-js/pull/145))
- Bump AWS API Gateway Terraform module from 0.11.0 to 1.1.0 ([#146](https://github.com/milliHQ/terraform-aws-next-js/pull/146))

### Proxy (0.7.0)

- Fix root route rewrites ([#139](https://github.com/milliHQ/terraform-aws-next-js/issues/139), [#141](https://github.com/milliHQ/terraform-aws-next-js/pull/141))

## 0.9.0 - (June 15, 2021)

**⚠️ Breaking Changes ⚠️**

Since the main CloudFront distribution is a central resource that may need advanced customization, we decided to introduce a new way to fully customize the distribution for to your needs.

As part of this change a few input variables are no longer supported and should be removed from the module.

If you are not using one of these variables you can safely upgrade to this release without further changes.

If you use one of the following input variables read below for more information how to upgrade:

- `cloudfront_custom_behaviors`
- `cloudfront_geo_restriction`
- `cloudfront_origins`
- `cloudfront_viewer_certificate_arn`
- `cloudfront_minimum_protocol_version`
- `create_domain_name_records`
- `domain_names`
- `domain_zone_names`

If you are already using one of these input variables you should now create a new CloudFront resource in your `main.tf` file and link it with the Next.js module.

For more information please see the ["with existing CloudFront"](https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/with-existing-cloudfront) and ["with custom domain"](https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/with-custom-domain) examples.

### Terraform module

- Enable usage of external CloudFront resource ([#55](https://github.com/milliHQ/terraform-aws-next-js/issues/55), [#134](https://github.com/milliHQ/terraform-aws-next-js/pull/134), [#137](https://github.com/milliHQ/terraform-aws-next-js/pull/137))
- Queue CloudFront invalidations ([#48](https://github.com/milliHQ/terraform-aws-next-js/issues/48), [#125](https://github.com/milliHQ/terraform-aws-next-js/pull/125))
- Attaching Lambda to VPC ([#110](https://github.com/milliHQ/terraform-aws-next-js/issues/110), [#111](https://github.com/milliHQ/terraform-aws-next-js/pull/111))  
  Thanks to [@chamilad](https://github.com/chamilad) for contributing!
- Remove provider proxy from proxy-config module ([#102](https://github.com/milliHQ/terraform-aws-next-js/issues/102), [#124](https://github.com/milliHQ/terraform-aws-next-js/pull/124))

## Proxy (0.6.0)

- Support rewriting to an external URL ([#65](https://github.com/milliHQ/terraform-aws-next-js/issues/65), [#120](https://github.com/milliHQ/terraform-aws-next-js/pull/120))
- Bump runtime from `nodejs12.x` to `nodejs14.x` ([#136](https://github.com/milliHQ/terraform-aws-next-js/pull/136))

### Deploy trigger (0.4.0)

- Queue CloudFront invalidations ([#48](https://github.com/milliHQ/terraform-aws-next-js/issues/48), [#125](https://github.com/milliHQ/terraform-aws-next-js/pull/125))

## tf-next (0.7.0)

- Adds support for yarn workspaces ([#93](https://github.com/milliHQ/terraform-aws-next-js/issues/93), [#107](https://github.com/milliHQ/terraform-aws-next-js/pull/107))

### Runtime (1.1.0)

- Bump @vercel/nft from 0.9.5 to 0.10.0 ([#112](https://github.com/milliHQ/terraform-aws-next-js/pull/112))

## 0.8.1 - (April 27, 2021)

### Terraform module

- Fixes compatibility with Terraform 0.15 ([#115](https://github.com/milliHQ/terraform-aws-next-js/issues/115), [#118](https://github.com/milliHQ/terraform-aws-next-js/pull/118))
- Bump AWS Lambda Terraform module from 1.34.0 to 1.47.0 ([#117](https://github.com/milliHQ/terraform-aws-next-js/pull/117))
- Bump Next.js Image Optimization module from 10.0.5 to 10.0.8 ([#116](https://github.com/milliHQ/terraform-aws-next-js/pull/116))

## 0.8.0 - (April 05, 2021)

This release enables Brotli in addition to gzip as default compression method.

**⚠️ Breaking Changes ⚠️**

Before upgrading make sure that you define a new alias `global_region` for the AWS Provider in the `us-east-1` region.
This provider alias is used to create the Lambda@Edge function that must be created in `us-east-1`.

```diff
# main.tf
provider "aws" {
  region = "us-west-2"
}

+ provider "aws" {
+   alias  = "global_region"
+   region = "us-east-1"
+ }

module "tf_next" {
  source = "dealmore/next-js/aws"

+ providers = {
+   aws.global_region = aws.global_region
+ }
}
```

### Terraform module

- Removes internal AWS provider for `us-east-1` region ([#50](https://github.com/milliHQ/terraform-aws-next-js/issues/50), [#101](https://github.com/milliHQ/terraform-aws-next-js/pull/101))
- Enable Brotli compression for CloudFront ([#8](https://github.com/milliHQ/terraform-aws-next-js/issues/8), [#82](https://github.com/milliHQ/terraform-aws-next-js/pull/82))
- Adds `cloudfront_geo_restriction` variable ([#97](https://github.com/milliHQ/terraform-aws-next-js/pull/97))
- Use `nodejs14.x` as default runtime for Lambda ([#67](https://github.com/milliHQ/terraform-aws-next-js/pull/67), [#80](https://github.com/milliHQ/terraform-aws-next-js/issues/80), [#81](https://github.com/milliHQ/terraform-aws-next-js/pull/81))

### Deploy trigger (0.3.0)

- CloudFront invalidations for static files (e.g. static prerendered HTML or files from `public/`) are only issues if the eTag of the file changes ([#48](https://github.com/milliHQ/terraform-aws-next-js/issues/48), [#91](https://github.com/milliHQ/terraform-aws-next-js/pull/91))

### tf-next (0.6.1)

- Ensure that `INIT_CWD` environment variable is set to the correct working directory ([#87](https://github.com/milliHQ/terraform-aws-next-js/pull/87))

### tf-next (0.6.0)

- Allows dependencies (e.g. Prisma & Blitz.js) to correctly detect the build environment ([#70](https://github.com/milliHQ/terraform-aws-next-js/issues/70), [#73](https://github.com/milliHQ/terraform-aws-next-js/issues/73), [#85](https://github.com/milliHQ/terraform-aws-next-js/pull/85))

## 0.7.4 (April 03, 2021)

### Terraform module

- Use `concat` instead of `merge` for custom CloudFront origins and cache behaviors ([#66](https://github.com/milliHQ/terraform-aws-next-js/issues/66), [#105](https://github.com/milliHQ/terraform-aws-next-js/pull/105))

## 0.7.3 (March 08, 2021)

### Terraform module

- Bump internal module `terraform-aws-modules/apigateway-v2/aws` from `0.5.0` to `0.11.0` ([#68](https://github.com/milliHQ/terraform-aws-next-js/pull/68))
- Bump internal module `dealmore/next-js-image-optimization/aws` from `2.0.0` to `2.0.1` ([#68](https://github.com/milliHQ/terraform-aws-next-js/pull/68))

## 0.7.2 (March 04, 2021)

### Terraform module

- Fix for invalid function argument error introduced by `0.7.1` release ([#59](https://github.com/milliHQ/terraform-aws-next-js/issues/59))

## 0.7.1 (March 04, 2021)

### Terraform module

- Add option to set the image optimizer version ([#58](https://github.com/milliHQ/terraform-aws-next-js/issues/58))

## 0.7.0 (February 13, 2021)

This release brings support for [Next.js image optimization](https://nextjs.org/docs/basic-features/image-optimization) 📸.  
No extra config is needed, simply update the Terraform module and the `tf-next` package to the latest version!  
Check out our example for more information: [Next image component example](https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/next-image)

You can always opt-out from creating resources for image optimization by setting `create_image_optimization = false`.

### Terraform module

- Adds support for `next/image` component ([#28](https://github.com/milliHQ/terraform-aws-next-js/issues/28), [#51](https://github.com/milliHQ/terraform-aws-next-js/pull/51))
- Refactoring: Outsources a previously private Terraform module, that is now used across multiple projects. Is now avaiable here: [NPM Download Terraform module
  ](https://registry.terraform.io/modules/milliHQ/download/npm) ([#41](https://github.com/milliHQ/terraform-aws-next-js/issues/41))

### tf-next (0.5.0)

- Adds support for `next/image` component ([#28](https://github.com/milliHQ/terraform-aws-next-js/issues/28), [#51](https://github.com/milliHQ/terraform-aws-next-js/pull/51))

### Proxy (0.5.0)

- Internal refactoring which changes the way the module is bundled. No feature changes ([#43](https://github.com/milliHQ/terraform-aws-next-js/issues/43))

### Deploy trigger (0.2.0)

- Internal refactoring which changes the way the module is bundled. No feature changes ([#43](https://github.com/milliHQ/terraform-aws-next-js/issues/43))

## 0.6.2 (January 19, 2021)

### Terraform module

- Bump internal module version of `terraform-aws-modules/lambda/aws`: 1.31.0 -> 1.34.0  
  This should fix an issue when performing a direct upgrade from `v0.3.0` to `v0.6.x`

## 0.6.1 (January 18, 2021)

### Terraform module

- Fix: Correctly propagate the permissions boundary (`lambda_role_permissions_boundary`) to all Lambda & Lambda@Edge functions ([#38](https://github.com/milliHQ/terraform-aws-next-js/pull/38))

### tf-next (0.4.1)

- Fix: Request cookie header should be semi-colon delimitated ([#39](https://github.com/milliHQ/terraform-aws-next-js/pull/39))

## 0.6.0 (January 16, 2021)

**⚠️ Breaking Changes ⚠️**

You need to update the `tf-next` package to the latest version in order to use it with the `v0.6.0` release.

```sh
npm upgrade tf-next@latest   # npm
yarn upgrade tf-next@latest  # yarn
```

### Terraform module

- Upgrade to API Gateway Payload V2.0 ([#29](https://github.com/milliHQ/terraform-aws-next-js/issues/29), [#31](https://github.com/milliHQ/terraform-aws-next-js/pull/31))  
  This is only an upgrade of the internally API used by Lambda and API Gateway (Not the resource itself, since we already use API Gateway V2). See this [guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html) for a detailed look at the differences between the V1.0 and V2.0 format.
  It fixes a bug where no multi-value headers could be sent by a SSR or API page.
- Sends an error message when you try to use the Terraform module together with an old version of `tf-next` ([#5](https://github.com/milliHQ/terraform-aws-next-js/issues/5), [#37](https://github.com/milliHQ/terraform-aws-next-js/pull/37))
- Upgrades proxy component to `v0.4.0`

### tf-next (0.4.0)

- Adds a version number to the config file, so that the Terraform module is able to warn about a possible version mismatch ([#5](https://github.com/milliHQ/terraform-aws-next-js/issues/5), [#37](https://github.com/milliHQ/terraform-aws-next-js/pull/37))

### Proxy (0.4.0)

- Fix to handle `resource` handle type properly

## 0.5.3 (January 15, 2021)

### Terraform module

- Fix: Pass permissions boundary to edge proxy lambda ([#35](https://github.com/milliHQ/terraform-aws-next-js/pull/35))

## 0.5.2 (January 14, 2021)

### Terraform module

- Adds `tags` variable to set tags on supported AWS resources ([#34](https://github.com/milliHQ/terraform-aws-next-js/pull/34))
- Adds `lambda_role_permissions_boundary` variable for setting a permission boundary for the Lambda role ([#33](https://github.com/milliHQ/terraform-aws-next-js/pull/33))

## 0.5.1 (January 13, 2021)

### Terraform module

- Adds `cloudfront_hosted_zone_id` output ([#30](https://github.com/milliHQ/terraform-aws-next-js/pull/30)).

## 0.5.0 (January 03, 2021)

Happy New Year! 🍾  
With this release we bring native support for [redirects](https://nextjs.org/docs/api-reference/next.config.js/redirects) in Next.js.

### Proxy (0.3.0)

- Adds ability to handle redirects ([#10](https://github.com/milliHQ/terraform-aws-next-js/issues/10), [#24](https://github.com/milliHQ/terraform-aws-next-js/pull/24)).

### tf-next (0.3.0)

- The build tool got a new name, now it is simply `tf-next` instead of `@dealmore/terraform-next-build`.  
  For backwards compatibility we plan to release new versions to both the old and the new package name until v1.0.

- When running `tf-next build` we now filter out routes with the prefix `_next/static/*` since they are handled directly by CloudFront and will never hit the Proxy.

## 0.4.0 (December 30, 2020)

- Adds [new example](https://github.com/milliHQ/terraform-aws-next-js/blob/main/examples/custom-domain) how to use custom domains.

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

> **Note:** This will be the last release with support for Terraform `v12.x`, see [#18](https://github.com/milliHQ/terraform-aws-next-js/issues/18) for more information.

### Terraform module

- Destroy non-empty S3 buckets on stack deletion
- Experimental support for pre-Rendered routes ([#16](https://github.com/milliHQ/terraform-aws-next-js/issues/16))

### Terraform Next Build

- Experimental support for pre-Rendered routes ([#16](https://github.com/milliHQ/terraform-aws-next-js/issues/16))

### Proxy

- Experimental support for pre-Rendered routes ([#16](https://github.com/milliHQ/terraform-aws-next-js/issues/16))
