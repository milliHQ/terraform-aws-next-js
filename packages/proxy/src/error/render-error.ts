import { STATUS_CODES } from 'http';

import { CloudFrontResultResponse } from 'aws-lambda';

type RenderErrorOptions = {
  errorCode: string;
  /**
   * HTTP status code.
   */
  status: number;
  /**
   * How long should this live in the CloudFront cache.
   */
  ttl?: number;
};

/**
 * Render a customer facing HTML error response.
 */
function renderError({
  errorCode,
  status,
  ttl = 0,
}: RenderErrorOptions): CloudFrontResultResponse {
  const title = `${status} - ${STATUS_CODES[status]}`;

  return {
    status: status.toString(),
    headers: {
      'cache-control': [
        {
          key: 'Cache-Control',
          value: `public, max-age=${ttl}, must-revalidate`,
        },
      ],
      'content-type': [
        {
          key: 'Content-Type',
          value: 'text/html; charset=utf-8',
        },
      ],
    },
    body: `<!DOCTYPE html><html lang=en><meta charset=utf-8><meta content="width=device-width,initial-scale=1"name=viewport><meta content=#000 name=theme-color><title>${title}</title><style>html{font-family:Inter var,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-size:16px}body{margin:0}h1{font-size:1.2rem}main{height:100vh;padding:0;margin:0;display:flex;align-items:center;justify-content:center}.container{border:2px solid #ebebeb;border-radius:6px;padding:24px 32px;min-width:36rem}</style><main><div class=container><h1>${title}</h1><p>Code: <code>${errorCode}</code></div></main>`,
  };
}

export { renderError };
