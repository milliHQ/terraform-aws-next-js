import { parseCloudFormationEvent } from '../../src/utils/parse-cloudformation-event';

test('Create Complete: IAM Role', () => {
  const message = `StackId='arn:aws:cloudformation:eu-central-1:238476290347:stack/tfn-d35de1a94815e0562689b89b6225cd85/319a93a0-c3df-11ec-9e1a-0a226e11de6a'
Timestamp='2022-04-24T15:00:11.646Z'
EventId='lambdaRoleC844FDB1-CREATE_COMPLETE-2022-04-24T15:00:11.646Z'
LogicalResourceId='lambdaRoleC844FDB1'
Namespace='238476290347'
PhysicalResourceId='tfn-d35de1a94815e0562689b89b622-lambdaRoleC844FDB1-3O50QZY56BMU'
ResourceProperties='{\"Description\":\"Managed by Terraform Next.js\",\"AssumeRolePolicyDocument\":{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"}}]}}'
ResourceStatus='CREATE_COMPLETE'
ResourceStatusReason=''
ResourceType='AWS::IAM::Role'
StackName='tfn-d35de1a94815e0562689b89b6225cd85'
ClientRequestToken='null'
`;

  const result = parseCloudFormationEvent(message);

  expect(result).toMatchObject({
    StackId:
      'arn:aws:cloudformation:eu-central-1:238476290347:stack/tfn-d35de1a94815e0562689b89b6225cd85/319a93a0-c3df-11ec-9e1a-0a226e11de6a',
    Timestamp: '2022-04-24T15:00:11.646Z',
    EventId: 'lambdaRoleC844FDB1-CREATE_COMPLETE-2022-04-24T15:00:11.646Z',
    LogicalResourceId: 'lambdaRoleC844FDB1',
    Namespace: '238476290347',
    PhysicalResourceId:
      'tfn-d35de1a94815e0562689b89b622-lambdaRoleC844FDB1-3O50QZY56BMU',
    ResourceProperties:
      '{"Description":"Managed by Terraform Next.js","AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]}}',
    ResourceStatus: 'CREATE_COMPLETE',
    ResourceStatusReason: '',
    ResourceType: 'AWS::IAM::Role',
    StackName: 'tfn-d35de1a94815e0562689b89b6225cd85',
    ClientRequestToken: 'null',
  });
});
