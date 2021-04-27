# Terraform Next.js custom domain example

This example shows how to use a custom domain with the [Next.js Terraform module for AWS](https://registry.terraform.io/modules/dealmore/next-js/aws).

You can find the full example code on [GitHub](https://github.com/dealmore/terraform-aws-next-js/tree/main/examples/custom-domain).

## Setup

Download the files from the example app:

```sh
yarn create next-app --example https://github.com/dealmore/terraform-aws-next-js/tree/main/examples/custom-domain my-app

cd my-app
```

## Build

Prepare the Next.js application to be deployed with Terraform:

```sh
yarn tf-next
```

## Setting the domain

Open the `main.tf` file in the root of the Next.js app, and change the following:

```tf
# main.tf
...

locals {
  # Your custom domain
  custom_domain = "example.com"
}

...
```

You can change `example.com` to every domain that is associated with Route 53 in your AWS account.

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
