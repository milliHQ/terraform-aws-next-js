# Upgrading to 0.8.0

This is a guide for upgrading from a previous version of this module to `v0.8.0`.

With version `v0.8.0` the CloudFront distributions were updated to use [cache and origin request policies](https://aws.amazon.com/blogs/networking-and-content-delivery/amazon-cloudfront-announces-cache-and-origin-request-policies/) ([#82](https://github.com/dealmore/terraform-aws-next-js/pull/82)) instead of the (now) legacy cache settings.

Unfortunately the Terraform AWS provider currently does not support ([terraform-provider-aws#17626](https://github.com/hashicorp/terraform-provider-aws/issues/17626)) upgrading existing CloudFront distributions from the legacy settings to policies, so the update requires a manual step in the console.

If you are not sure whether you need to apply this steps, you can run `terraform apply`.
When the following error message appears you need to do the manual update:

```
Error: error updating CloudFront Distribution (E27ZJ807F87DQA): InvalidArgument: The parameter ForwardedValues cannot be used when a cache policy is associated to the cache behavior.
        status code: 400, request id: 012b60c1-adc8-4175-a5ff-111d819e2b18
```

## Manual upgrade from the AWS Console

Terraform Next.js module for AWS uses two CloudFront distributions, that booth need to be upgraded.

### Upgrading Proxy-Config CloudFront distribution

1. Login into the [AWS Console](https://console.aws.amazon.com/).
2. Go to the [CloudFront service page](https://console.aws.amazon.com/cloudfront/home).
3. Click in the sidebar left on "Distributions".
4. Select the distribution with the suffix **"- Proxy-Config"** (From the "Comment" column) in the list.
5. With the distribution click on "Distribution Settings" button above.
6. In the next screen go to the "Behaviors" tab.
7. It should show you a single behavior in the list. Select it and click on the "Edit" button above.
8. For the setting **"Cache and origin request settings"** switch to **"Use a cache policy and origin request policy"**
9. For **"Cache Policy"** now select **"Managed-CachingOptimizedForUncompressedObjects"** from the dropdown
10. For **"Origin Request Policy"** now select **"Managed-CORS-S3Origin"** from the dropdown
11. Click the button **"Yes, edit"** in the bottom right corner

### Upgrading the main CloudFront distribution

1. Login into the [AWS Console](https://console.aws.amazon.com/).
2. Go to the [CloudFront service page](https://console.aws.amazon.com/cloudfront/home).
3. Click in the sidebar left on "Distributions".
4. Select the distribution with the suffix **"- Main"** (From the "Comment" column) in the list.
5. With the distribution click on "Distribution Settings" button above.
6. In the next screen go to the "Behaviors" tab.
7. Based on your configuration you should see 2 or more entries, the following steps should be completed for each entry:

8. Select a behavior from the list. Click on the "Edit" button above.
9. For the setting **"Cache and origin request settings"** switch to **"Use a cache policy and origin request policy"**.
10. For **"Cache Policy"** now select **"Managed-CachingOptimized"** from the dropdown.
11. For **"Origin Request Policy"** now select **"Managed-CORS-S3Origin"** from the dropdown.
12. Click the button **"Yes, edit"** in the bottom right corner.

13. Repeat the steps 8-12 for all behaviors from this distribution.

After the manual upgrade through the console, run `terraform apply` again.
This time it should apply the changes without errors.
If you still experience issues, please [create an issue](https://github.com/dealmore/terraform-aws-next-js/issues).
