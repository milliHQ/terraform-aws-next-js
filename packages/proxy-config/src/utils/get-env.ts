import { CloudFrontRequest } from 'aws-lambda';

/**
 * Gets a environment variable from the CloudFront Request
 */
function getEnv(request: CloudFrontRequest, key: string) {
  const env = request.origin?.custom?.customHeaders[key][0];

  if (!env) {
    throw new Error(`Env ${key} is not set.`);
  }

  return env.value;
}

export { getEnv };
