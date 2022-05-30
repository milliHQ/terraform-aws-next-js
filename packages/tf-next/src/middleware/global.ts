import { MiddlewareFunction, Options } from 'yargs';

import { GlobalOptions } from '../types';

/**
 * Global middleware that runs before every command.
 */
const globalMiddleware: MiddlewareFunction<GlobalOptions> = (argv) => {
  // Set logLevel
  if (typeof argv.verbose === 'boolean') {
    argv.logLevel = argv.verbose ? 'verbose' : 'none';
  }

  // Set cwd
  argv.commandCwd = process.cwd();
};

/**
 * Command line options that are added when the globalMiddleware is used.
 */
const globalMiddlewareOptions: Record<string, Options> = {
  verbose: {
    type: 'boolean',
    description: 'Run with verbose logging.',
  },
};

export { globalMiddleware, globalMiddlewareOptions };
