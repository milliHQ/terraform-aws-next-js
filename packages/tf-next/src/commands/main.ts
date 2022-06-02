import chalk from 'chalk';
import { Argv } from 'yargs';

import {
  globalMiddleware,
  globalMiddlewareOptions,
} from '../middleware/global';

import { createAliasCommand } from './alias';
import { createBuildCommand } from './build';
import { createDeployCommand } from './deploy';
import { createDeploymentCommand } from './deployment';

const CLI_TITLE = 'milliVolt CLI';

/**
 * Creates the `tf-next` command.
 * Composes all sub commands together.
 */
function createMainCommand(globalYargs: Argv) {
  // Register global options and middleware
  globalYargs
    .strict()
    .options(globalMiddlewareOptions)
    // @ts-ignore - Don't know how to fix this
    .middleware(globalMiddleware)
    .demandCommand()
    // Show version on each command
    .showVersion((message) =>
      console.log(chalk.gray`${CLI_TITLE} ${message}\n`)
    )
    .hide('verbose');

  const yargs = globalYargs as Argv<any>;

  // Register all subcommands
  createAliasCommand(yargs);
  createBuildCommand(yargs);
  createDeployCommand(yargs);
  createDeploymentCommand(yargs);

  return yargs;
}

export { createMainCommand };
