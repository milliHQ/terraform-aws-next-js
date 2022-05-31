import { Options } from 'yargs';

import { GlobalOptions } from '../../../types';
import { ApiService } from '../api';
import {
  readProjectConfig,
  writeProjectConfig,
} from '../../../utils/project-config';
import { AwsCredentialProvider } from '../../aws-profile';

/* -----------------------------------------------------------------------------
 * apiMiddleware
 * ---------------------------------------------------------------------------*/

type ApiMiddlewareArguments = {
  endpoint?: string;
} & GlobalOptions;

function apiMiddleware(
  argv: ApiMiddlewareArguments,
  awsCredentialProvider: AwsCredentialProvider
): ApiService {
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

  // Write projectConfig
  if (!projectConfig || projectConfig.apiEndpoint !== endpoint) {
    writeProjectConfig(argv.commandCwd, {
      apiEndpoint: endpoint,
    });
  }

  return new ApiService({
    awsCredentialProvider,
    apiEndpoint: endpoint,
  });
}

const apiMiddlewareOptions: Record<string, Options> = {
  endpoint: {
    type: 'string',
    description: 'API endpoint to use.',
  },
};

export { apiMiddleware, apiMiddlewareOptions };
