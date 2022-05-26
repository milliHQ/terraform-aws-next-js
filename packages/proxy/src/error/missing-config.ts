import { CloudFrontResultResponse } from 'aws-lambda';

import { renderError } from './render-error';

/**
 * Used when the config of the proxy cannot be loaded
 */
class MissingConfigError extends Error {
  toCloudFrontResponse(): CloudFrontResultResponse {
    return renderError({
      status: 500,
      errorCode: 'PROXY_MISSING_CONFIG',
    });
  }
}

export { MissingConfigError };
