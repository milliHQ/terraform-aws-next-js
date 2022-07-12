import { Response } from 'node-fetch';

type ResponseErrorOptions = {
  status: number;
  code: string;
  message?: string;
  serverMessage?: string;
};

class ResponseError extends Error {
  status: number;
  code: string;
  serverMessage?: string;

  constructor({ status, code, message, serverMessage }: ResponseErrorOptions) {
    super(message);

    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
  }
}

async function createResponseError(res: Response): Promise<ResponseError> {
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

  // AWS authentication Error
  // The forbidden message does not follow the schema of error responses from
  // API since the authorization is handled by API Gateway.
  if (res.status === 403) {
    return new ResponseError({
      status: 403,
      code: 'PERMISSION_ERROR',
      serverMessage: message,
      message:
        'Authentication failed.\nMake sure that the AWS user has the correct permissions.',
    });
  }

  return new ResponseError({
    status,
    code,
    message,
  });
}

export { createResponseError, ResponseError };
