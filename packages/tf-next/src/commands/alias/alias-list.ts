import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';

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
 * Prints the latest 25 deployments to the console.
 */
async function aliasListCommand({
  client,
  deploymentId,
}: AliasListCommandOptions) {
  const { apiService } = client;

  const items = await apiService.listAliases(deploymentId);
  console.table(items);
}

/* -----------------------------------------------------------------------------
 * createAliasListCommand
 * ---------------------------------------------------------------------------*/

type AliasListCommandArguments = {
  deploymentId: string;
} & GlobalOptions;

const createAliasListCommand = withClient<AliasListCommandArguments>((yargs) =>
  yargs.command(
    'ls <deployment-id>',
    'List the aliases that are associated with a deployment',
    (yargs) => {
      yargs.positional('deployment-id', {
        describe: 'ID of the deployment.',
        type: 'string',
      });
    },
    ({ client, deploymentId }) =>
      aliasListCommand({
        client,
        deploymentId,
      })
  )
);

export { createAliasListCommand };
