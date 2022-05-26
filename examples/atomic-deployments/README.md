# Atomic Deployments Example

This example shows how to use the atomic deployments feature with the [Next.js Terraform module for AWS](https://registry.terraform.io/modules/milliHQ/next-js/aws).

## Features

- Unlimited parallel deployments of Next.js with a single CloudFront distribution
- Preview deployment subdomains, e.g. `<deployment-id>.example.com`

> **Note:** You can find the full example code on [GitHub](https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/atomic-deployments).

## Setup

Download the files from the example app:

```sh
yarn create next-app --example https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/atomic-deployments my-app

cd my-app
```

## Setup

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
# Expose your AWS Access Keys to the current terminal session
# Only needed when running Terraform commands
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
> api_endpoint_access_policy_arn = "arn:aws:..."
```

## Build

Prepare the Next.js application to be deployed with Terraform:

```sh
npm run tf-next
```

## Deploy

Deploy the previously built Next.js app to the AWS infrastructure:

```sh
tf-next deploy --endpoint https://<api-id>.execute-api.<region>.amazonaws.com

> ✅ Upload complete.
> ✅ Deployment complete.
> Available at: https://<deployment-id>.example.com
```

You can now access your Next.js app in the browser under the `https://<deployment-id>.example.com` domain.
