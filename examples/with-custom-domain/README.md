# Terraform Next.js custom domain example

> **Warning:** This example is not fully updated for the upcoming `v1.0.0` release.  
> We recommend following the [Atomic Deployments Example](https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/atomic-deployments) instead until this example gets an update.

This example shows how to use a custom domain with the [Next.js Terraform module for AWS](https://registry.terraform.io/modules/milliHQ/next-js/aws).

## Features

- Creates a new domain record in Route53
- Provisions a free SSL certificate from the AWS Certificate Manager for the domain
- Assigns the domain and the SSL certificate to the CloudFront distribution

> **Note:** You can find the full example code on [GitHub](https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/with-custom-domain).

## Setup

Download the files from the example app:

```sh
yarn create next-app --example https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/with-custom-domain my-app

cd my-app
```

## Build

Prepare the Next.js application to be deployed with Terraform:

```sh
yarn tf-next
```

## Setting the domain

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

## Deploy

Use Terraform to deploy the Next.js app to your AWS account:

```sh
# Expose your AWS Access Keys to the current terminal session
# Only needed when running Terraform commands
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

terraform init    # Only needed on the first time running Terraform

terraform plan    # (Optional) See what resources Terraform will create
terraform apply   # Deploy the Next.js app to your AWS account
```

After the deployment was successful, you should see the following output:

```sh
> Apply complete!
>
> Outputs:
>
> cloudfront_domain_name = "<distribution-id>.cloudfront.net"
> custom_domain_name     = "example.com"
```

You can now access your Next.js app in the browser under the [example.com](https://example.com) or [https://&lt;distribution-id&gt;.cloudfront.net](https://<distribution-id>.cloudfront.net) domain.
