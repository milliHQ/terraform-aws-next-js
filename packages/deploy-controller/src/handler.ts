import { SNSEvent } from 'aws-lambda';

import { parseCloudFormationEvent } from './utils/parse-cloudformation-event';

/**
 * Entry point for the Lambda handler.
 * Receives CloudFormation status change events from SNS.
 */
async function handler(event: SNSEvent) {
  event.Records.forEach((record) => {
    const message = record.Sns.Message;
    const parsedEvent = parseCloudFormationEvent(message);

    const { ResourceType, ResourceStatus } = parsedEvent;

    // Only handle stack related events
    if (ResourceType !== 'AWS::CloudFormation::Stack') {
      return;
    }

    if (ResourceStatus === undefined) {
      console.error(
        'Error: Could not handle event, no `ResourceStatus` in event.'
      );
      return;
    }

    switch (ResourceStatus) {
      case 'CREATE_COMPLETE':
        console.log('Event');
        console.log(JSON.stringify(parsedEvent, null, 2));

      case 'DELETE_COMPLETE':

      case 'CREATE_FAILED':
      // TODO: Inform about failed deployment

      default:
      // Event is not handled, since it is not relevant
    }
  });
}

export { handler };
