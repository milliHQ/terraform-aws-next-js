import * as lambda from 'aws-cdk-lib/aws-lambda';

import { SupportedRuntime } from '../types';

function getRuntime(runtimeIdentifier: SupportedRuntime | string) {
  switch (runtimeIdentifier) {
    case 'nodejs12.x':
      return lambda.Runtime.NODEJS_12_X;

    case 'nodejs14.x':
      return lambda.Runtime.NODEJS_14_X;

    case 'nodejs16.x':
      return lambda.Runtime.NODEJS_16_X;

    default:
      throw new Error(`Runtime not supported: ${runtimeIdentifier}`);
  }
}

export { getRuntime };
