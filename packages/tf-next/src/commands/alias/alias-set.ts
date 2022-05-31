import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';

/* -----------------------------------------------------------------------------
 * aliasSetCommand
 * ---------------------------------------------------------------------------*/

type AliasSetCommandOptions = {
  /**
   * Global client.
   */
  client: Client;
  /**
   * The domain name of the alias.
   */
  customDomain: string;
  /**
   * DeploymentId or alias where the alias should link to
   */
  target: string;
  /**
   * Override an existing alias.
   */
  override: boolean;
};

/**
 * Creates a new alias or overrides an existing one.
 */
async function aliasSetCommand({
  client,
  customDomain,
  target,
  override,
}: AliasSetCommandOptions) {
  const { apiService, output } = client;

  output.spinner('Creating alias');
  const alias = await apiService.createAlias({
    alias: customDomain,
    target,
    override,
  });

  output.stopSpinner();

  if (alias) {
    output.log(`Alias created: ${alias?.id}`);
  } else {
    output.log('Could not create alias');
  }
}

/* -----------------------------------------------------------------------------
 * createAliasSetCommand
 * ---------------------------------------------------------------------------*/

type AliasSetCommandArguments = {
  // Positional arguments
  customDomain: string;
  target: string;
  // Optional arguments
  force?: boolean;
} & GlobalOptions;

const createAliasSetCommand = withClient<AliasSetCommandArguments>(
  'set <custom-domain> <target>',
  'Links an alias to a deployment or another alias',
  (yargs) => {
    yargs
      .positional('custom-domain', {
        describe: 'Domain of the alias',
        type: 'string',
      })
      .positional('target', {
        describe: 'deployment id or other alias',
        type: 'string',
      });
    yargs.options({
      force: {
        type: 'boolean',
        description: 'Override existing alias',
      },
    });
  },
  ({ client, customDomain, target, force }) =>
    aliasSetCommand({
      client,
      customDomain,
      target,
      override: !!force,
    })
);

export { createAliasSetCommand };
