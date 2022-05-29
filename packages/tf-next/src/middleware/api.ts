import { MiddlewareFunction, Options } from 'yargs';

import { ApiService } from '../api';
import { GlobalOptions } from '../types';
import { readProjectConfig, writeProjectConfig } from '../utils/project-config';
import { AWSProfileArguments, awsProfileMiddleware } from './aws-profile';

/* -----------------------------------------------------------------------------
 * apiMiddleware
 * ---------------------------------------------------------------------------*/

type ApiMiddlewareArguments = {
  endpoint?: string;
} & AWSProfileArguments &
  GlobalOptions;

const apiMiddleware: MiddlewareFunction<ApiMiddlewareArguments> = (argv) => {
  // Check for project config
  const projectConfig = readProjectConfig(argv.commandCwd);
  let endpoint: string | undefined;

  if (typeof argv.endpoint === 'string') {
    endpoint = argv.endpoint;
  } else if (projectConfig) {
    endpoint = projectConfig.apiEndpoint;
  }

  if (endpoint === undefined) {
    // TODO: Format this error
    throw new Error('API endpoint is not set.');
  }

  if (!argv.awsCredentialProvider) {
    throw new Error('AWS credentialProvider not set.');
  }

  argv.apiService = new ApiService({
    awsCredentialProvider: argv.awsCredentialProvider,
    apiEndpoint: endpoint,
  });

  // Write projectConfig
  if (!projectConfig || projectConfig.apiEndpoint !== endpoint) {
    writeProjectConfig(argv.commandCwd, {
      apiEndpoint: endpoint,
    });
  }
};

const apiMiddlewareOptions: Record<string, Options> = {
  endpoint: {
    type: 'string',
    description: 'API endpoint to use.',
  },
};

/* -----------------------------------------------------------------------------
 * createApiMiddleware
 * ---------------------------------------------------------------------------*/

type AfterApiMiddlewareArguments = {
  apiService: ApiService;
};

const composedApiMiddleware = [awsProfileMiddleware, apiMiddleware];

/**
 * Composes the middleware that is required for the api layer.
 */
function createApiMiddleware(): MiddlewareFunction<any>[] {
  return composedApiMiddleware;
}

export type { AfterApiMiddlewareArguments as ApiMiddlewareArguments };
export { createApiMiddleware, apiMiddlewareOptions };
