import chalk from 'chalk';
import ms from 'ms';
import table from 'text-table';

import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';
import { DeploymentNotExists, ResponseError } from '../../utils/errors';
import { strlen } from '../../utils/strlen';

/* -----------------------------------------------------------------------------
 * aliasListCommand
 * ---------------------------------------------------------------------------*/

type AliasListCommandOptions = {
  /**
   * Global client service.
   */
  client: Client;
  /**
   * DeploymentId
   */
  deploymentId: string;
};

/**
 * Prints the latest 25 aliases for a deployment to the console.
 */
async function aliasListCommand({
  client,
  deploymentId,
}: AliasListCommandOptions) {
  const { apiService, output } = client;

  output.spinner(`Fetching aliases for deployment ${deploymentId}`);
  try {
    const aliases = await apiService.listAliases(deploymentId);
    output.stopSpinner();

    if (aliases.length === 0) {
      output.log(
        `No aliases linked to deployment ${deploymentId}\nCreate a new alias with the 'tf-next alias set' command.`
      );
      return;
    }

    output.log(`Linked aliases for deployment ${deploymentId}:\n`);

    // Print table
    const todayMillis = Date.now();
    console.log(
      table(
        [
          // Header
          ['age ▼', 'alias'].map((header) => chalk.dim(header)),
          // Data
          ...aliases.map((alias) => [
            ms(todayMillis - new Date(alias.createDate).getTime()),
            `https://${alias.id}`,
          ]),
        ],
        {
          hsep: ' '.repeat(3),
          stringLength: strlen,
        }
      ).replace(/^/gm, '  ') + '\n'
    );
  } catch (error: ResponseError | any) {
    if (error.code === 'DEPLOYMENT_NOT_FOUND') {
      throw new DeploymentNotExists(deploymentId);
    }

    throw error;
  }
}

/* -----------------------------------------------------------------------------
 * createAliasListCommand
 * ---------------------------------------------------------------------------*/

type AliasListCommandArguments = {
  deploymentId: string;
} & GlobalOptions;

const createAliasListCommand = withClient<AliasListCommandArguments>(
  'ls <deployment-id>',
  'List aliases that are linked to a deployment',
  (yargs) => {
    return yargs.positional('deployment-id', {
      describe: 'ID of the deployment',
      type: 'string',
    });
  },
  ({ client, deploymentId }) =>
    aliasListCommand({
      client,
      deploymentId,
    })
);

export { createAliasListCommand };
