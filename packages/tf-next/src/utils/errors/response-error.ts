import { Response } from 'node-fetch';

type ResponseError = {
  status: number;
  code: string;
  message: string;
};

async function createResponseError(res: Response): Promise<ResponseError> {
  // AWS authentication Error
  // The forbidden message does not follow the schema of error responses from
  // API since the authorization is handled by API Gateway.
  if (res.status === 403) {
    return {
      status: 403,
      code: 'PERMISSION_ERROR',
      message: '',
    };
  }

  let errorBody: Record<string, any> = {};

  // Try to parse the error
  if (res.headers.get('content-type') === 'application/json') {
    try {
      errorBody = await res.json();
    } catch (_ignoredError) {}
  }

  const status =
    typeof errorBody.status === 'number' ? errorBody.status : res.status;
  const code = typeof errorBody.code === 'string' ? errorBody.code : '';
  const message =
    typeof errorBody.message === 'string' ? errorBody.message : '';

  return {
    status,
    code,
    message,
  };
}

export type { ResponseError };
export { createResponseError };
