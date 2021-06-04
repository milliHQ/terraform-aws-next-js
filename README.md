# Terraform Next.js module for AWS

![CI status](https://github.com/dealmore/terraform-aws-next-js/workflows/CI/badge.svg)

A zero-config Terraform module for self-hosting Next.js sites serverless on AWS Lambda.

## Features

Some features are still under development, here is a list of features that are currently supported and what we plan to bring with the next releases:

- ✅ &nbsp;Next.js `v9.5+` & `v10+` _(older Versions might work but are not actively supported)_
- ✅ &nbsp;Terraform `v0.13+`
- ✅ &nbsp;Static, SSG, Lambda and API pages (with [dynamic routes](https://nextjs.org/docs/routing/dynamic-routes))
- ✅ &nbsp;Automatic expiration of old static assets
- ✅ &nbsp;[Rewrites](https://nextjs.org/docs/api-reference/next.config.js/rewrites) & [Redirects](https://nextjs.org/docs/api-reference/next.config.js/redirects)
- ✅ &nbsp;[Image Component & Image Optimization](https://nextjs.org/docs/basic-features/image-optimization) support
- 🚧 &nbsp;[Incremental Static Regeneration](https://nextjs.org/docs/basic-features/data-fetching#incremental-static-regeneration)
- 🚧 &nbsp;[AWS CodeDeploy](https://aws.amazon.com/codedeploy/)

## Architecture

The Next.js Terraform module is designed as a full stack AWS app. It relies on multiple AWS services and connects them to work as a single application:

![Architecture overview diagram](https://github.com/dealmore/terraform-aws-next-js/blob/main/docs/assets/architecture.png?raw=true)

- **`I.` CloudFront**

  This is the main CloudFront distribution which handles all incoming traffic to the Next.js application.
  Static assets with the prefix `/_next/static/*` (e.g. JavaScript, CSS, images) are identified here and served directly from a static content S3 bucket ([`II`](#II-s3-static-content)).
  Other requests are delegated to the proxy handler Lambda@Edge function ([`III`](#III-lambda-edge-proxy)).

- **`II.` S3 bucket for static content**<a id="II-s3-static-content"></a>

  This bucket contains the pre-rendered static HTML sites from the Next.js build and the static assets (JavaScript, CSS, images, etc.).

- **`III.` Lambda@Edge proxy handler**<a id="III-lambda-edge-proxy"></a>

  The proxy handler analyzes the incoming requests and determines from which source a request should be served.
  Static generated sites are fetched from the S3 bucket ([`II`](#II-s3-static-content)) and dynamic content is served from the Next.js Lambdas ([`V`](#V-next-js-lambdas)).

- **`IV.` API Gateway**<a id="IV-api-gateway"></a>

  The [HTTP API Gateway](https://aws.amazon.com/api-gateway/) distributes the incoming traffic on the existing Next.js Lambdas ([`V`](#V-next-js-lambdas)). It uses a cost efficient HTTP API for this.

- **`V.` Shared Next.js Lambda functions**<a id="V-next-js-lambdas"></a>

  These are the Next.js Lambdas which are doing the server-side rendering. They are composed, so a single lambda can serve multiple SSR-pages.

- **Terraform Next.js Image Optimization**

  The [image optimization](https://nextjs.org/docs/basic-features/image-optimization) is triggered by routes with the prefix `/_next/image/*`.
  It is a serverless task provided by our [Terraform Next.js Image Optimization module for AWS](https://registry.terraform.io/modules/dealmore/next-js-image-optimization/aws).

- **Static Content Deployment**

  This flow is only triggered when a Terraform apply runs to update the application.
  It consists of a dedicated S3 bucket and a single Lambda function.
  The bucket is only used by Terraform to upload the static content from the `tf-next build` command as a zip archive.
  The upload then triggers the Lambda which unzips the content and deploys it to the static content S3 bucket ([`II`](#II-s3-static-content)).
  Static assets from previous deployments are then marked to be expired in a certain amount of days (default 30, configurable via `expire_static_assets` variable).
  After the successful deployment a CloudFront [invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html) is created to propagate the route changes to every edge location.

- **Proxy Config Distribution**

  This is a second CloudFront distribution that serves a special JSON file that the Proxy ([`III`](#III-lambda-edge-proxy)) fetches as configuration (Contains information about routes).

## Usage

### Add to your Next.js project

First add our custom builder to your Next.js project. It uses the same builder under the hood as Vercel does:

```sh
npm i -D tf-next     # npm or
yarn add -D tf-next  # yarn
```

Then you should add a new script to your package.json (Make sure it is not named `build`):

```diff
{
  ...
  "scripts": {
    "dev": "next",
    "build": "next build",
    "start": "next start",
+   "tf-next": "tf-next build"
  }
  ...
}
```

`tf-next build` runs in a temporary directory and puts its output in a `.next-tf` directory in the same directory where your `package.json` is.
The output in the `.next-tf` directory is all what the Terraform module needs in the next step.

### Setup the Next.js Terraform module

> **Note:** Make sure that the `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` environment variables are set when running the Terraform commands. [How to create AWS Access Keys?](https://docs.aws.amazon.com/powershell/latest/userguide/pstools-appendix-sign-up.html)

Adding Terraform to your existing Next.js installation is easy.
Simply create a new `main.tf` file in the root of your Next.js project and add the following content:

```tf
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

# Main region where the resources should be created in
# (Should be close to the location of your viewers)
provider "aws" {
  region = "us-west-2"
}

# Provider used for creating the Lambda@Edge function which must be deployed
# to us-east-1 region (Should not be changed)
provider "aws" {
  alias  = "global_region"
  region = "us-east-1"
}

module "tf_next" {
  source = "dealmore/next-js/aws"

  providers = {
    aws.global_region = aws.global_region
  }
}

output "cloudfront_domain_name" {
  value = module.tf_next.cloudfront_domain_name
}
```

To deploy your app to AWS simply run the following commands:

```sh
npm run tf-next   # Build the Next.js app
yarn tf-next      # Same command when using yarn

# Expose your AWS Access Keys to the current terminal session
# Only needed when running Terraform commands
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

terraform init    # Only needed on the first time running Terraform

terraform plan    # (Optional) See what resources Terraform will create
terraform apply   # Deploy the Next.js app to your AWS account

> Apply complete!
>
> Outputs:
>
> cloudfront_domain_name = "xxxxxxxxxxxxxx.cloudfront.net"
```

After the successful deployment your Next.js app is publicly available at the CloudFront subdomain from the `cloudfront_domain_name` output.

### Deployment with Terraform Cloud

When using this module together with [Terraform Cloud](https://www.terraform.io/) make sure that you also upload the build output from the [`tf-next`](https://www.npmjs.com/package/tf-next) task.
You can create a `.terraformignore` in the root of your project and add the following line:

```diff
# .terraformignore
+  !**/.next-tf/**
```

## Examples

- [Complete](https://github.com/dealmore/terraform-aws-next-js/blob/main/examples/complete) - Complete example with SSR, API and static pages.
- [Static](https://github.com/dealmore/terraform-aws-next-js/blob/main/examples/static) - Example that uses static pages only (No SSR).
- [Custom Domain](https://github.com/dealmore/terraform-aws-next-js/blob/main/examples/custom-domain) - Demonstrates how to use the module with a custom domain from Route 53.

<!-- prettier-ignore-start -->
<!--- BEGIN_TF_DOCS --->
## Requirements

| Name | Version |
|------|---------|
| terraform | >= 0.13 |
| aws | >= 3.34.0 |
| random | >= 2.3.0 |

## Providers

| Name | Version |
|------|---------|
| aws | >= 3.34.0 |
| random | >= 2.3.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| cloudfront\_cache\_key\_headers | Header keys that should be used to calculate the cache key in CloudFront. | `list(string)` | <pre>[<br>  "Authorization"<br>]</pre> | no |
| cloudfront\_custom\_behaviors | n/a | `list(any)` | `null` | no |
| cloudfront\_geo\_restriction | Options to control distribution of content, object with restriction\_type and locations. | <pre>object({<br>    restriction_type = string,<br>    locations        = list(string),<br>  })</pre> | <pre>{<br>  "locations": [],<br>  "restriction_type": "none"<br>}</pre> | no |
| cloudfront\_minimum\_protocol\_version | Minimum version of the SSL protocol that you want CloudFront to use for HTTPS connections. One of SSLv3, TLSv1, TLSv1\_2016, TLSv1.1\_2016, TLSv1.2\_2018 or TLSv1.2\_2019. | `string` | `"TLSv1.2_2019"` | no |
| cloudfront\_origin\_headers | Header keys that should be sent to the S3 or Lambda origins. Should not contain any header that is defined via cloudfront\_cache\_key\_headers. | `list(string)` | `[]` | no |
| cloudfront\_origins | n/a | `list(any)` | `null` | no |
| cloudfront\_price\_class | Price class for the CloudFront distributions (main & proxy config). One of PriceClass\_All, PriceClass\_200, PriceClass\_100. | `string` | `"PriceClass_100"` | no |
| cloudfront\_viewer\_certificate\_arn | n/a | `string` | `null` | no |
| create\_domain\_name\_records | Controls whether Route 53 records for the for the domain\_names should be created. | `bool` | `true` | no |
| create\_image\_optimization | Controls whether resources for image optimization support should be created or not. | `bool` | `true` | no |
| debug\_use\_local\_packages | Use locally built packages rather than download them from npm. | `bool` | `false` | no |
| deployment\_name | Identifier for the deployment group (alphanumeric characters, underscores, hyphens, slashes, hash signs and dots are allowed). | `string` | `"tf-next"` | no |
| domain\_names | Alternative domain names for the CloudFront distribution. | `list(string)` | `[]` | no |
| domain\_zone\_names | n/a | `list(string)` | `[]` | no |
| expire\_static\_assets | Number of days after which static assets from previous deployments should be removed from S3. Set to -1 to disable expiration. | `number` | `30` | no |
| lambda\_attach\_to\_vpc | Set to true if the Lambda functions should be attached to a VPC. Use this setting if VPC resources should be accessed by the Lambda functions. When setting this to true, use vpc\_security\_group\_ids and vpc\_subnet\_ids to specify the VPC networking. Note that attaching to a VPC would introduce a delay on to cold starts | `bool` | `false` | no |
| lambda\_environment\_variables | Map that defines environment variables for the Lambda Functions in Next.js. | `map(string)` | `{}` | no |
| lambda\_memory\_size | Amount of memory in MB a Lambda Function can use at runtime. Valid value between 128 MB to 10,240 MB, in 1 MB increments. | `number` | `1024` | no |
| lambda\_policy\_json | Additional policy document as JSON to attach to the Lambda Function role | `string` | `null` | no |
| lambda\_role\_permissions\_boundary | ARN of IAM policy that scopes aws\_iam\_role access for the lambda | `string` | `null` | no |
| lambda\_runtime | Lambda Function runtime | `string` | `"nodejs14.x"` | no |
| lambda\_timeout | Max amount of time a Lambda Function has to return a response in seconds. Should not be more than 30 (Limited by API Gateway). | `number` | `10` | no |
| next\_tf\_dir | Relative path to the .next-tf dir. | `string` | `"./.next-tf"` | no |
| tags | Tag metadata to label AWS resources that support tags. | `map(string)` | `{}` | no |
| use\_awscli\_for\_static\_upload | Use AWS CLI when uploading static resources to S3 instead of default Bash script. Some cases may fail with 403 Forbidden when using the Bash script. | `bool` | `false` | no |
| vpc\_security\_group\_ids | The list of Security Group IDs to be used by the Lambda functions. lambda\_attach\_to\_vpc should be set to true for these to be applied. | `list(string)` | `[]` | no |
| vpc\_subnet\_ids | The list of VPC subnet IDs to attach the Lambda functions. lambda\_attach\_to\_vpc should be set to true for these to be applied. | `list(string)` | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| cloudfront\_domain\_name | The domain of the main CloudFront distribution. |
| cloudfront\_hosted\_zone\_id | The zone id of the main CloudFront distribution. |
| static\_upload\_bucket\_id | n/a |

<!--- END_TF_DOCS --->
<!-- prettier-ignore-end -->

## Known issues

Under the hood this module uses a lot of [Vercel's](https://github.com/vercel/vercel/) build pipeline.
So issues that exist on Vercel are likely to occur on this project too.

- Stack deletion (`terraform destroy`) fails on first run ([terraform-provider-aws#1721](https://github.com/hashicorp/terraform-provider-aws/issues/1721))

  This is intentional because we cannot delete a Lambda@Edge function (Used by proxy module) in a synchronous way.
  It can take up to an hour for AWS to unbind a Lambda@Edge function from it's CloudFront distribution even when the distribution is already destroyed.

  **Workaround:**

  After running the initial `terraform destroy` command (that failed) wait ~1 hour and run the command again.
  This time it should run successfully and delete the rest of the stack.

## License

Apache-2.0 - see [LICENSE](./LICENSE) for details.

> **Note:** All sample projects in [`examples/*`](./examples) are licensed as MIT to comply with the official [Next.js examples](https://github.com/vercel/next.js/tree/canary/examples).
