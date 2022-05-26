import { ResourceStatus } from 'aws-sdk/clients/cloudformation';

type ResourceType = 'AWS::CloudFormation::Stack' | string;

type CloudFormationEvent = {
  StackId?: string;
  Timestamp?: string;
  EventId?: string;
  LogicalResourceId?: string;
  Namespace?: string;
  PhysicalResourceId?: string;
  PrincipalId?: string;
  /**
   * Contains properties that are used to create the resource.
   * Is a string that contains a JSON object or null.
   */
  ResourceProperties?: string;
  ResourceStatus?: ResourceStatus | undefined;
  ResourceStatusReason?: string;
  ResourceType?: ResourceType;
  StackName?: string;
  ClientRequestToken?: string;
};

// RegEx that matches AttributeName='value'
// Copied from https://github.com/motdotla/dotenv/blob/master/lib/main.js
const LINE =
  /(?:^|^)\s*([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;
/**
 * Thankfully CloudFormation sends the event not as message attributes, but as
 * a single string that has to be parsed.
 *
 * @see {@link https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/635}
 */
function parseCloudFormationEvent(
  incomingMessage: string
): CloudFormationEvent {
  // Message format:
  //
  // - Each attribute is separated by a new line (\n)
  // - AttributeName='value'

  const result: CloudFormationEvent = {};

  let match;
  while ((match = LINE.exec(incomingMessage)) != null) {
    const key = match[1] as keyof CloudFormationEvent;
    let value = match[2] || '';

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, '$2');

    // Add to result
    result[key] = value;
  }

  return result;
}

export { parseCloudFormationEvent };
