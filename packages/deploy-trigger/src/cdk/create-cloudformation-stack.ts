import { Stack } from 'aws-cdk-lib';
import CloudFormation from 'aws-sdk/clients/cloudformation';

import { toCloudFormation } from './to-cloudformation';

type CreateCloudFormationStackReturnValue = {
  /**
   * The full arn of the created CloudFormation stack.
   */
  stackARN: string;
};

type CreateCloudFormationStackOptions = {
  /**
   * SNS topic ARNs that should be notified of stack change events
   * @see {@link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-stack.html#cfn-cloudformation-stack-notificationarns}
   */
  notificationARNs: string[];
  stack: Stack;
  stackName: string;
  /**
   * ARN of the role that should be used for managing the CloudFormation stack.
   */
  cloudFormationRoleArn: string;
};

async function createCloudFormationStack({
  notificationARNs,
  stack,
  stackName,
  cloudFormationRoleArn,
}: CreateCloudFormationStackOptions): Promise<CreateCloudFormationStackReturnValue> {
  const cloudformationClient = new CloudFormation();
  const template = toCloudFormation(stack);

  const result = await cloudformationClient
    .createStack({
      Capabilities: ['CAPABILITY_IAM'],
      NotificationARNs: notificationARNs,
      StackName: stackName,
      TemplateBody: JSON.stringify(template),
      RoleARN: cloudFormationRoleArn,
    })
    .promise();

  if (result.$response.error) {
    throw result.$response.error;
  }

  if (!result.$response.data?.StackId) {
    throw new Error('No stackId returned.');
  }

  return {
    stackARN: result.$response.data.StackId,
  };
}

export { createCloudFormationStack };
