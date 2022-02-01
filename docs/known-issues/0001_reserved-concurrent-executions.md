# Function decreases account's UnreservedConcurrentExecution below its minimum value

<table>
  <tr>
    <th>Status</th>
    <td>workaround available</td>
  </tr>
  <tr>
    <th>x-ref</th>
    <td>
      <a href="https://github.com/milliHQ/terraform-aws-next-js/issues/251">#251</a>
    </td>
  </tr>
</table>

## Error message

After running the initial `terraform apply`, the command fails with the following error message:

> Specified ReservedConcurrentExecutions for function decreases account's UnreservedConcurrentExecution below its minimum value of [50].

## Problem

The module requests a reserved concurrent execution of 1 for the deploy-trigger component.
This is a Lambda function that runs after every apply and is responsible for updating files in the associated S3 bucket.

To ensure that concurrent deployments do not override each other, we limit the maximal number of concurrent instances of this function to 1.

While this produces no extra costs, it counts towards the account's concurrent executions quota.

For newer AWS accounts this quota has been lowered from 1000 to 50.

Since 50 is the account's required minimum for concurrent executions, no new lambda with a reserved concurrent execution can be created.

## Workaround

You can simply request an increase of the "Concurrent executions quota" (L-B99A9384) through the AWS console at no extra costs.

The quota increase can be requested here: https://console.aws.amazon.com/servicequotas/home/services/lambda/quotas/L-B99A9384

Any value greater than 50 should work, the [default quota is 1000](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html#compute-and-storage).

It usually takes 2-3 business days until the increase is granted.
