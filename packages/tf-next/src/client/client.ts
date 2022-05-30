import { Argv, MiddlewareFunction } from 'yargs';
import { GlobalOptions, LogLevel } from '../types';
import {
  awsProfileMiddleware,
  awsProfileMiddlewareOptions,
} from './aws-profile';

import {
  ApiService,
  apiMiddlewareOptions,
  apiMiddleware,
} from './services/api';

type ClientOptions = {
  logLevel: LogLevel;
  apiService?: ApiService;
};

class Client {
  logLevel: LogLevel;
  // TODO: apiService is only present, when it is available from ClientOptions
  // Typing this correctly would take too long
  public apiService!: ApiService;

  constructor({ logLevel, apiService }: ClientOptions) {
    this.logLevel = logLevel;

    if (apiService) {
      this.apiService = apiService;
    }
  }
}

/* -----------------------------------------------------------------------------
 * clientMiddleware
 * ---------------------------------------------------------------------------*/

type ClientMiddlewareArguments = {
  client: Client;
};

type CreateClientMiddlewareOptions = {
  withApiService: boolean;
};

const createClientMiddleware =
  (options: CreateClientMiddlewareOptions): MiddlewareFunction<GlobalOptions> =>
  (argv) => {
    let apiService: ApiService | undefined;

    if (options.withApiService) {
      // Get AWS profile
      const awsCredentialProvider = awsProfileMiddleware(argv);
      apiService = apiMiddleware(argv, awsCredentialProvider);
    }

    argv.client = new Client({
      logLevel: argv.logLevel,
      apiService,
    });
  };

/* -----------------------------------------------------------------------------
 * withClient
 * ---------------------------------------------------------------------------*/

type WithClientOptions = {
  withApiService?: boolean;
};

function withClient<Args extends GlobalOptions>(
  commandInitializer: (
    yargs: Argv<Args & ClientMiddlewareArguments>
  ) => Argv<any>,
  options: WithClientOptions = {}
) {
  const { withApiService = true } = options;

  return (yargs: Argv<Args & ClientMiddlewareArguments>) => {
    const localYargs = commandInitializer(yargs);

    if (withApiService) {
      localYargs.options({
        ...awsProfileMiddlewareOptions,
        ...apiMiddlewareOptions,
      });
    }

    localYargs.middleware(
      createClientMiddleware({
        withApiService,
      })
    );
  };
}

export type { Client };
export { withClient };
