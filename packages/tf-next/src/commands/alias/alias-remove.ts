import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';
import { createSpinner } from '../../utils/create-spinner';

/* -----------------------------------------------------------------------------
 * aliasRemoveCommand
 * ---------------------------------------------------------------------------*/

type AliasRemoveCommandOptions = {
  /**
   * Global client service.
   */
  client: Client;
  /**
   * The domain name of the alias.
   */
  customDomain: string;
};

/**
 * Creates a new alias or overrides an existing one.
 */
async function aliasRemoveCommand({
  client,
  customDomain,
}: AliasRemoveCommandOptions) {
  const { apiService } = client;

  const spinner = createSpinner('Removing alias');
  spinner.start();
  const success = await apiService.deleteAlias(customDomain);
  spinner.stopAndPersist();

  if (success) {
    console.log('Alias was successfully removed');
  } else {
    console.log('Could not create alias');
  }
}

/* -----------------------------------------------------------------------------
 * createAliasRemoveCommand
 * ---------------------------------------------------------------------------*/

type AliasRemoveCommandArguments = {
  // Positional arguments
  customDomain: string;
} & GlobalOptions;

const createAliasRemoveCommand = withClient<AliasRemoveCommandArguments>(
  'rm <custom-domain>',
  'Remove an existing alias',
  (yargs) => {
    yargs.positional('custom-domain', {
      describe: 'Domain of the alias',
      type: 'string',
    });
  },
  ({ client, customDomain }) =>
    aliasRemoveCommand({
      client,
      customDomain,
    })
);

export { createAliasRemoveCommand };
