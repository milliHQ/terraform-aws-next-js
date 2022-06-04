import chalk from 'chalk';

import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';
import { AliasOverrideNotAllowed, ResponseError } from '../../utils/errors';
import { trimProtocol } from '../../utils/trim-protocol';

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
  const trimmedCustomDomain = trimProtocol(customDomain);
  const trimmedTarget = trimProtocol(target);

  output.spinner('Creating alias');
  try {
    const alias = await apiService.createAlias({
      alias: trimmedCustomDomain,
      target: trimmedTarget,
      override,
    });

    output.success(
      `Alias created: https://${
        alias.id
      }\n${chalk.gray`Now linked to deployment ${alias.deployment}`}`
    );
  } catch (error: ResponseError | any) {
    if (error.code === 'ALIAS_OVERRIDE_NOT_ALLOWED') {
      throw new AliasOverrideNotAllowed(trimmedCustomDomain);
    }

    throw error;
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
  'Creates an alias that is linked to a deployment or another alias',
  (yargs) => {
    yargs
      .positional('custom-domain', {
        describe: 'Domain of the alias',
        type: 'string',
      })
      .positional('target', {
        describe: 'deployment-id or other alias',
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
