import { CloudFrontResultResponse } from 'aws-lambda';

import { renderError } from './render-error';

class AliasNotConfigured extends Error {
  isHandled = true;

  toCloudFrontResponse(): CloudFrontResultResponse {
    return renderError({
      status: 404,
      errorCode: 'PROXY_ALIAS_NOT_CONFIGURED',
      ttl: 60,
    });
  }
}

export { AliasNotConfigured };
