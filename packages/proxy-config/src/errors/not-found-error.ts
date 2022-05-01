import { CloudFrontResultResponse } from 'aws-lambda';

class NotFoundError extends Error {
  toCloudFrontResponse(): CloudFrontResultResponse {
    return {
      status: '404',
      headers: {
        // 404 errors should be stored indefinitely in CloudFront cache, can
        // only reset through invalidation
        'cache-control': [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000',
          },
        ],
        'content-type': [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
      body: JSON.stringify({
        status: 404,
        message: this.message,
      }),
    };
  }
}

export { NotFoundError };
