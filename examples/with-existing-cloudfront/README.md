# Example with existing CloudFront distribution

> **Warning:** This example is not fully updated for the upcoming `v1.0.0` release.  
> We recommend following the [Atomic Deployments Example](https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/atomic-deployments) instead until this example gets an update.

This example shows how to integrate the Terraform Next.js module for AWS into an existing CloudFront distribution (Without creating a new one).

> **Note:** The full example code is available on [GitHub](https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/with-existing-cloudfront)

## Setup

Download the files from the example app:

```sh
yarn create next-app --example https://github.com/milliHQ/terraform-aws-next-js/tree/main/examples/with-existing-cloudfront my-app

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
