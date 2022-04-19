import { Stack } from 'aws-cdk-lib';
import CloudFormation from 'aws-sdk/clients/cloudformation';

import { toCloudFormation } from './to-cloudformation';

type CreateCloudFormationStackOptions = {
  stack: Stack;
  stackName: string;
};

async function createCloudFormationStack({
  stack,
  stackName,
}: CreateCloudFormationStackOptions) {
  const cloudformationClient = new CloudFormation();
  const template = toCloudFormation(stack);

  console.log('TEMPLATE', JSON.stringify(template, null, 2));

  const result = await cloudformationClient
    .createStack({
      StackName: stackName,
      TemplateBody: JSON.stringify(template),
      Capabilities: ['CAPABILITY_IAM'],
    })
    .promise();

  console.log('CF Result:', result);

  // TOOD: Wait until the stack is finished
}

export { createCloudFormationStack };
