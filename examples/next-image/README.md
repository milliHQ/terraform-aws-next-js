# Terraform Next.js Image component example

This example shows the usage of Next.js together with the `next/image` component.
You can find the full example code on [GitHub](https://github.com/milliHQ/terraform-aws-next-js/tree/v0.x/examples/next-image).

> **Note:** Support for `next/image` component is enabled in the Terraform Next.js module by default and requires no extra config other than the standard setup!

## Setup

Download the files from the example app:

```sh
yarn create next-app --example https://github.com/milliHQ/terraform-aws-next-js/tree/v0.x/examples/next-image my-app

cd my-app
```

## Build

Prepare the Next.js application to be deployed with Terraform:

```sh
yarn tf-next
```

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
```

You can now access your Next.js app in the browser under the [https://&lt;distribution-id&gt;.cloudfront.net](https://<distribution-id>.cloudfront.net) domain.
