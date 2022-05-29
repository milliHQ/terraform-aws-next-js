import { Argv } from 'yargs';

import {
  globalMiddleware,
  globalMiddlewareOptions,
} from '../middleware/global';
import { GlobalOptions } from '../types';

import { createAliasCommand } from './alias';
import { createBuildCommand } from './build';
import { createDeployCommand } from './deploy';
import { createDeploymentCommand } from './deployment';

/**
 * Creates the `tf-next` command.
 * Composes all sub commands together.
 */
function createMainCommand(globalYargs: Argv) {
  // Register global options and middleware
  globalYargs
    .options(globalMiddlewareOptions)
    // @ts-ignore - Don't know how to fix this
    .middleware(globalMiddleware);

  const yargs = globalYargs as Argv<GlobalOptions>;

  // Register all subcommands
  createAliasCommand(yargs);
  createBuildCommand(yargs);
  createDeployCommand(yargs);
  createDeploymentCommand(yargs);

  return yargs;
}

export { createMainCommand };
