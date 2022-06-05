import { SNSEvent } from 'aws-lambda';

type CreateTestMessageOptions = {
  StackId?: string | null;
  Timestamp?: string | null;
  EventId?: string | null;
  LogicalResourceId?: string | null;
  Namespace?: string | null;
  PhysicalResourceId?: string | null;
  ResourceProperties?: string | null;
  ResourceStatus?: string | null;
  ResourceStatusReason?: string | null;
  ResourceType?: string | null;
  StackName?: string | null;
  ClientRequestToken?: string | null;
};

const defaultMessageContent: Record<keyof CreateTestMessageOptions, string> = {
  StackId:
    'arn:aws:cloudformation:eu-central-1:238476290347:stack/tfn-d35de1a94815e0562689b89b6225cd85/319a93a0-c3df-11ec-9e1a-0a226e11de6a',
  Timestamp: '2022-04-24T15:00:11.646Z',
  EventId: 'lambdaRoleC844FDB1-CREATE_COMPLETE-2022-04-24T15:00:11.646Z',
  LogicalResourceId: 'lambdaRoleC844FDB1',
  Namespace: '238476290347',
  PhysicalResourceId:
    'fn-d35de1a94815e0562689b89b622-lambdaRoleC844FDB1-3O50QZY56BMU',
  ResourceProperties:
    '{"Description":"Managed by Terraform Next.js","AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]}}',
  ResourceStatus: 'CREATE_COMPLETE',
  ResourceStatusReason: '',
  ResourceType: 'AWS::CloudFormation::Stack',
  StackName: 'tfn-d35de1a94815e0562689b89b6225cd85',
  ClientRequestToken: 'null',
};

function createTestMessage(options: CreateTestMessageOptions = {}): string {
  return Object.entries(defaultMessageContent).reduce(
    (acc, [_key, defaultValue]) => {
      const key = _key as keyof CreateTestMessageOptions;
      const optionsValue = options[key];
      let value: string;

      if (optionsValue === null) {
        // Dont set value
        return acc;
      } else if (optionsValue === undefined) {
        // Use default value
        value = defaultValue;
      } else {
        value = optionsValue;
      }

      return acc + `${key}='${value}'\n`;
    },
    ''
  );
}

function createTestSNSEvent(options: CreateTestMessageOptions = {}): SNSEvent {
  return {
    Records: [
      {
        EventVersion: '',
        EventSubscriptionArn: '',
        EventSource: '',
        Sns: {
          SignatureVersion: '',
          Timestamp: '',
          Signature: '',
          SigningCertUrl: '',
          MessageId: '',
          Message: createTestMessage(options),
          MessageAttributes: {},
          Type: '',
          UnsubscribeUrl: '',
          TopicArn: '',
          Subject: '',
        },
      },
    ],
  };
}

export { createTestSNSEvent };
