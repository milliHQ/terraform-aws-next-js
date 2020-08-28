# AWS Next.js Terraform module ![Test proxy](https://github.com/dealmore/terraform-aws-next-js/workflows/Test%20proxy/badge.svg)

## Features

This module is under active development.
Some features are still under development, so here you can see a list of features that are currently supported and what we plan to bring in the next releases.

- [x] Next.js `v9.5+` (older Versions might work but are not actively supported)
- [x] Terraform `v0.12` & `v0.13`
- [x] Static, SSR and API pages (with [dynamic routes](https://nextjs.org/docs/routing/dynamic-routes))
- [x] [Rewrites](https://nextjs.org/docs/api-reference/next.config.js/rewrites)
- [ ] [Redirects](https://nextjs.org/docs/api-reference/next.config.js/redirects)
- [ ] [Incremental Static Regeneration](https://nextjs.org/docs/basic-features/data-fetching#incremental-static-regeneration)
- [ ] Automatic expiring of old build assets
- [ ] [AWS CodeDeploy](https://aws.amazon.com/codedeploy/)

## Architecture

The Next.js Terraform module is designed as a full stack AWS app. It relies on multiple AWS services and ties them together to work as a single application:

![Architecture overview diagram](./docs/assets/architecture.png)

- **`I.` CloudFront**

  This is the main CloudFront distribution which handles all incoming traffic to the Next.js application.
  Static assets with the prefix `/_next/static/*` (e.g. JavaScript, CSS, images) are identified here and is pulled from a static content S3 bucket ([`II`](#II-s3-static-content)).
  Other requests are delegated to the proxy handler Lambda@Edge function ([`III`](#III-lambda-edge-proxy)).

- **`II.` S3 bucket for static content**<a id="II-s3-static-content"></a>

  This bucket contains the static generated sites from the Next.js build and the static assets (JavaScript, CSS, images, ...).

- **`III.` Lambda@Edge proxy handler**<a id="III-lambda-edge-proxy"></a>

  The proxy handler analyzes the incoming requests and determines from which source a request should be served.
  Static generated sites are fetched from the S3 bucket ([`II`](#II-s3-static-content)) and dynamic content is served from the Next.js Lambdas ([`V`](#V-next-js-lambdas)).

* **`IV.` API Gateway**<a id="IV-api-gateway"></a>

* **`V.` Shared Next.js Lambda functions**<a id="V-next-js-lambdas"></a>

* **Static Content Deployment**

  This flow is only triggered when a Terraform apply runs to update the application.
  It consists of a dedicated S3 bucket and a single Lambda function.
  The bucket is only used by Terraform to upload the static content from the `tf-next build` command as a zip archive.
  The upload then triggers the Lambda which unzips the content and deploys it to the static content S3 bucket ([`II`](#II-s3-static-content)).

* **Proxy Config Distribution**

## Usage

### Add to your Next.js project

First add our custom builder to your Next.js project. It uses the same builder under the hood as Vercel does:

```sh
npm i -D @dealmore/terraform-next-build     # npm or
yarn add -D @dealmore/terraform-next-build  # yarn
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

> **Note:** Make sure that the `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` environment variables are set when running Terraform commands.

Adding Terraform to your existing Next.js installation is easy.
Simply create a new `main.tf` file in the root of your Next.js project and add the following content:

```tf
# main.tf

provider "aws" {
  version = "~> 3.0"
  region  = "eu-central-1" # Main region where the resources should be created in
}

module "lambdas" {
  source  = "dealmore/next-js/aws"
}
```

To deploy your app to AWS simply run the following commands:

```sh
terraform init    # Only needed on the first time running Terraform

yarn tf-next      # Build the next.js app
terraform plan    # See what resources Terraform will create
terraform apply   # Deploy the App to your AWS account
```

### `.terraformignore`

When using this module together with [Terraform Cloud](https://www.terraform.io/) make sure that you also upload the build output from the [`terraform-next-build`](https://www.npmjs.com/package/@dealmore/terraform-next-build) task.
You can create a `.terraformignore` in the root of your project and add the following line:

```diff
+  !**/.next-tf/**
```

## Examples

- [Complete](./examples/complete) - Complete example with SSR, API and static pages.

## Known issues

Under the hood this module uses a lot of [Vercel's](https://github.com/vercel/vercel/) build pipeline.
So issues that exist on Vercel are likely to occur on this project too.

- Missing monorepo support ([#3547](https://github.com/vercel/vercel/issues/3547))

  **Workaround (for yarn workspaces):**

  In the package, where Next.js is installed, add the following code to the `package.json`:

  ```json
  "workspaces": {
    "nohoist": [
      "**"
    ]
  },
  ```

  This ensures that all packages are installed to a `node_module` directory on the same level as the `package.json`.

## License

Apache-2.0 - see [LICENSE](./LICENSE) for details.
