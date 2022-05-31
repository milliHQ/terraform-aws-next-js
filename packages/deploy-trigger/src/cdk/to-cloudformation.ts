import { Stack } from 'aws-cdk-lib';
import { synthesize } from 'aws-cdk-lib/core/lib/private/synthesis';

/**
 * Utility to create a CloudFormation template from a Stack
 *
 * @see {@link https://github.com/aws/aws-cdk/blob/3e9f04dbbd7aadb8ab4394fefd6281f1d6d30fe0/packages/%40aws-cdk/core/test/util.ts#L5}
 *
 * @param stack
 * @returns
 */
function toCloudFormation(stack: Stack) {
  const template = synthesize(stack, { skipValidation: true }).getStackByName(
    stack.stackName
  ).template;

  // Remove cdk specific parameters from the CloudFormation template
  delete template.Rules.CheckBootstrapVersion;
  delete template.Parameters.BootstrapVersion;

  return template;
}

export { toCloudFormation };
