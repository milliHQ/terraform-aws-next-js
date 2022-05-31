import { CloudFrontRequest } from 'aws-lambda';

import { MissingConfigError } from '../error/missing-config';

/**
 * Gets a environment variable from the CloudFront Request
 */
function getEnv(request: CloudFrontRequest, key: string) {
  const env = request.origin?.s3?.customHeaders[key][0];

  if (!env) {
    throw new MissingConfigError(`Env ${key} is not set.`);
  }

  return env.value;
}

export { getEnv };
