# Atomic Deployments Example

This example shows how to use the atomic deployments feature with the [Next.js Terraform module for AWS](https://registry.terraform.io/modules/milliHQ/next-js/aws).

To learn more about this feature, please see the blog post ["The road to Atomic Deployments"](https://milli.is/blog/the-road-to-atomic-deployments) or watch the release review: [First look at the new atomic deployments feature](https://youtu.be/NY3zKnIcLd4).

## Features

- ✅ &nbsp;Unlimited parallel deployments of Next.js apps served by a single CloudFront distribution
- ✅ &nbsp;Preview deployment subdomains, e.g. `<deployment-id>.example.com`

> **Notice:** You can find the full example code on [GitHub](https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/atomic-deployments).

## How to use

> **Cost disclaimer**: All resources that are created in your AWS account are designed to be fully serverless.
> This means it produces **no running costs** until it is actually used (e.g. by deploying a Next.js application or when your app starts receiving requests from the web).
> Most of the resources created are also eligible for the [AWS always free tier](https://aws.amazon.com/free/).
>
> Highest cost factor in this example is the Route 53 hosted zone which can [produce costs of up to $0.50 / month](https://aws.amazon.com/route53/pricing/#Hosted_Zones_and_Records) when creating a new one.

Run [`create-next-app`](https://www.npmjs.com/package/create-next-app) with [npm](https://docs.npmjs.com/cli/init), [yarn](https://classic.yarnpkg.com/en/docs/cli/create/) or [pnpm](https://pnpm.io/cli/create) to bootstrap the example:

```sh
npx create-next-app --example https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/atomic-deployments atomic-deployments
# or
yarn create next-app --example https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/atomic-deployments atomic-deployments
# or
pnpm create next-app --example https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/atomic-deployments atomic-deployments
```

### Terraform setup

Use Terraform to deploy the base system to your AWS account.

Open the `main.tf` file in the root of the Next.js app, and set the custom domain that should be assigned to the CloudFront distribution:

```tf
# main.tf
...

variable "custom_domain" {
  description = "Your custom domain"
  type        = string
  default     = "example.com"
}

variable "custom_domain_zone_name" {
  description = "The Route53 zone name of the custom domain"
  type        = string
  default     = "example.com."
}

...
```

You can change `example.com` to every domain (or subdomain) that is associated with Route 53 in your AWS account.

Then deploy the base system.

```sh
# Expose your AWS Access Keys (administrator) to the current terminal session
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

terraform init    # Only needed on the first time running Terraform

terraform plan    # (Optional) See what resources Terraform will create
terraform apply   # Deploy the base system
```

After the deployment was successful, you should see the following output:

```sh
> Apply complete!
>
> Outputs:
>
> api_endpoint = "https://<api-id>.execute-api.<region>.amazonaws.com"
> api_endpoint_access_policy_arn = "arn:aws:iam::123456789012:policy/access-api"
```

> For deploying your apps in the next step you can optionally [create a new IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) and assign it the policy that you got from the `api_endpoint_access_policy_arn` output.  
> This is a security feature that prevents a full AWS account access during deployments. It only allows access to the internal API, but not to create, destroy or modify any resources in the AWS account directly.

### Build

First, install the [`tf-next`](https://github.com/milliHQ/terraform-aws-next-js/tree/main/packages/tf-next) CLI by running:

```
npm i -g tf-next@canary
# or
yarn global add tf-next@canary
# or
pnpm add -g tf-next@canary
```

Then prepare your Next.js application for a serverless deployment:

```sh
tf-next build
```

### Deploy

Deploy the previously built Next.js app to your AWS infrastructure. For the `--endpoint` flag use the domain you got from the `api_endpoint` output in the previous [Terraform Setup](#terraform-setup) step.

```sh
tf-next deploy --endpoint https://<api-id>.execute-api.<region>.amazonaws.com

> success Deployment package uploaded.
> success Deployment ready
> Available at: https://<deployment-id>.example.com/ (copied to clipboard)
```

You can now access your Next.js app in the browser at the `https://<deployment-id>.example.com` domain.  
Repeat the [build](#build) & [deploy](#deploy) step for each new app or deployment you want to push to the system.

## Cleanup

To delete all resources from your AWS account that were created in this examples follow this steps:

1. **Cleanup all deployments with the `tf-next` CLI**  
   First, get all active deployments through the CLI

   ```
   tf-next deployment ls

   >   age ▼   deployment-id                      status
   >   5m      59ec3b01f4325c906af8573efe0d75ba   ready
   ```

   Then remove each deployment by its id:

   ```
   tf-next deployment rm 59ec3b01f4325c906af8573efe0d75ba
   ```

   Repeat this until `tf-next deployment ls` shows no more active deployments.

2. **Remove the Terraform module**  
   To remove the deployment system (with it's global resources like CloudFront, S3 etc.) that were created with Terraform:

   ```
   terraform destroy
   ```

   > **Note:** The destroy command could fail on the first execution since [Lambda@Edge functions cannot be deleted in a synchronous way](https://github.com/hashicorp/terraform-provider-aws/issues/1721). You can workaround this by simply wait ~30 minutes and then run `terraform destroy` again.
