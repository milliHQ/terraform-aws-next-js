import { Stack } from 'aws-cdk-lib';
import CloudFormation from 'aws-sdk/clients/cloudformation';

import { toCloudFormation } from './to-cloudformation';

type CreateCloudFormationStackOptions = {
  /**
   * SNS topic ARNs that should be notified of stack change events
   * @see {@link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-stack.html#cfn-cloudformation-stack-notificationarns}
   */
  notificationARNs: string[];
  stack: Stack;
  stackName: string;
};

async function createCloudFormationStack({
  notificationARNs,
  stack,
  stackName,
}: CreateCloudFormationStackOptions) {
  const cloudformationClient = new CloudFormation();
  const template = toCloudFormation(stack);

  const result = await cloudformationClient
    .createStack({
      Capabilities: ['CAPABILITY_IAM'],
      NotificationARNs: notificationARNs,
      StackName: stackName,
      TemplateBody: JSON.stringify(template),
    })
    .promise();

  console.log('CF Result:', result);
}

export { createCloudFormationStack };
