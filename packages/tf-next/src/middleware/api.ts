import { MiddlewareFunction, Options } from 'yargs';

import { ApiService } from '../api';
import { AWSProfileArguments, awsProfileMiddleware } from './aws-profile';

/* -----------------------------------------------------------------------------
 * apiMiddleware
 * ---------------------------------------------------------------------------*/

type ApiMiddlewareArguments = {
  endpoint?: string;
} & AWSProfileArguments;

const apiMiddleware: MiddlewareFunction<ApiMiddlewareArguments> = (argv) => {
  if (typeof argv.endpoint !== 'string') {
    throw new Error('API endpoint is not set.');
  }

  if (!argv.awsCredentialProvider) {
    throw new Error('AWS credentialProvider not set.');
  }

  argv.apiService = new ApiService({
    awsCredentialProvider: argv.awsCredentialProvider,
    apiEndpoint: argv.endpoint,
  });

  return argv;
};

const apiMiddlewareOptions: Record<string, Options> = {
  endpoint: {
    type: 'string',
    description: 'API endpoint to use.',
    demandOption: true,
  },
};

/* -----------------------------------------------------------------------------
 * createApiMiddleware
 * ---------------------------------------------------------------------------*/

const composedApiMiddleware = [awsProfileMiddleware, apiMiddleware];

/**
 * Composes the middleware that is required for the api layer.
 */
function createApiMiddleware(): MiddlewareFunction<any>[] {
  return composedApiMiddleware;
}

export { createApiMiddleware, apiMiddlewareOptions };
