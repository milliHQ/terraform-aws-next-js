import {
  ArgumentsCamelCase,
  Argv,
  BuilderCallback,
  MiddlewareFunction,
} from 'yargs';

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
import { OutputService } from './services/output';

type ClientOptions = {
  logLevel: LogLevel;
  apiService?: ApiService;
};

class Client {
  logLevel: LogLevel;
  output: OutputService;
  // TODO: apiService is only present, when it is available from ClientOptions
  // Typing this correctly would take too long
  public apiService!: ApiService;

  constructor({ logLevel, apiService }: ClientOptions) {
    this.logLevel = logLevel;
    this.output = new OutputService({ logLevel });

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
  (options: CreateClientMiddlewareOptions): MiddlewareFunction<any> =>
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

function withClient<
  Args extends GlobalOptions,
  U = Args & ClientMiddlewareArguments
>(
  command: string | ReadonlyArray<string>,
  description: string,
  builder: BuilderCallback<Args, U>,
  handler: (args: ArgumentsCamelCase<U>) => void | Promise<void>,
  options: WithClientOptions = {}
) {
  const { withApiService = true } = options;

  return (yargs: Argv<Args>) => {
    const middleware = createClientMiddleware({
      withApiService,
    });
    const localBuilder: BuilderCallback<Args, U> = (localYargs) => {
      if (withApiService) {
        localYargs.options({
          ...awsProfileMiddlewareOptions,
          ...apiMiddlewareOptions,
        });
      }

      return builder(localYargs);
    };

    yargs.command(command, description, localBuilder, handler, [middleware]);
  };
}

export type { Client };
export { withClient };
