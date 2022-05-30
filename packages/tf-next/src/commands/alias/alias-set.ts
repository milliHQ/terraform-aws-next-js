import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';
import { createSpinner } from '../../utils/create-spinner';

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
  const { apiService } = client;

  const spinner = createSpinner('Creating alias');
  spinner.start();
  const alias = await apiService.createAlias({
    alias: customDomain,
    target,
    override,
  });

  spinner.stopAndPersist();

  if (alias) {
    console.log('Alias created: ', alias?.id);
  } else {
    console.log('Could not create alias');
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

const createAliasSetCommand = withClient<AliasSetCommandArguments>((yargs) =>
  yargs.command(
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
  )
);

export { createAliasSetCommand };
