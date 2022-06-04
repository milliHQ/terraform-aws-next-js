import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';
import {
  AliasNotExists,
  DeleteDeploymentAlias,
  ResponseError,
} from '../../utils/errors';
import { trimProtocol } from '../../utils/trim-protocol';

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
  const { apiService, output } = client;
  const alias = trimProtocol(customDomain);

  output.spinner('Removing alias');
  try {
    await apiService.deleteAlias(alias);
    output.success(`Alias ${alias} was removed.`);
  } catch (error: ResponseError | any) {
    if (error.code === 'ALIAS_NOT_FOUND') {
      throw new AliasNotExists(alias);
    }
    if (error.code === 'DEPLOYMENT_ALIAS') {
      throw new DeleteDeploymentAlias();
    }

    throw error;
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
