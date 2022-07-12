import globalYargs from 'yargs';

import { Client } from './client';
import { createMainCommand } from './commands/main';
import { CliError, ResponseError } from './utils/errors';

async function runCli() {
  let errorCaught = false;

  try {
    // Run CLI
    await createMainCommand(globalYargs).parseAsync(
      process.argv.slice(2),
      {},
      // Intentionally not using the .fail() method here, since fail does not
      // give us access to the argv argument.
      // @see {@link https://github.com/yargs/yargs/issues/2133}
      (error, argv, output) => {
        const client = argv.client as Client | undefined;

        // Ensure that the output halts
        if (client) {
          client.output.stopSpinner();
        }

        if (error instanceof CliError) {
          // Client should be initialized at this point
          if (!client) {
            throw new Error('Client was not initialized');
          }

          const { output } = client;

          output.error(error.message);
          errorCaught = true;
          process.exitCode = 1;
        } else if (error instanceof ResponseError) {
          // Unhandled error response from API
          const client = argv.client as Client;

          // Client should be initialized at this point
          if (!client) {
            throw new Error('Client was not initialized');
          }

          const { output } = client;
          if (error.serverMessage) {
            output.debug(`ServerMessage: ${error.serverMessage}`);
          }

          output.error(error.message);
          errorCaught = true;
          process.exitCode = 1;
        } else {
          if (output) {
            console.log(output);
          } else if (error) {
            console.error(error);
          }
        }
      }
    );
  } catch (potentiallyUncaughtError) {
    if (!errorCaught) {
      process.exitCode = 1;
      console.error(potentiallyUncaughtError);
    }
  }
}

runCli();
