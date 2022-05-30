import { ApiService } from '../../api';
import {
  ApiMiddlewareArguments,
  apiMiddlewareOptions,
  createApiMiddleware,
} from '../../middleware/api';
import { GlobalYargs } from '../../types';
import { createSpinner } from '../../utils/create-spinner';

/* -----------------------------------------------------------------------------
 * aliasSetCommand
 * ---------------------------------------------------------------------------*/

type AliasSetCommandOptions = {
  /**
   * ApiService to use.
   */
  apiService: ApiService;
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
  apiService,
  customDomain,
  target,
  override,
}: AliasSetCommandOptions) {
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
} & ApiMiddlewareArguments;

function createAliasSetCommand(yargs: GlobalYargs<AliasSetCommandArguments>) {
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
        ...apiMiddlewareOptions,
        force: {
          type: 'boolean',
          description: 'Override existing alias',
        },
      });
    },
    ({ apiService, customDomain, target, force }: AliasSetCommandArguments) =>
      aliasSetCommand({
        apiService,
        customDomain,
        target,
        override: !!force,
      }),
    createApiMiddleware()
  );
}

export { createAliasSetCommand };
