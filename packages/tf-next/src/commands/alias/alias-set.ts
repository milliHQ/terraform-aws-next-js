import { ApiService } from '../../api';
import {
  ApiMiddlewareArguments,
  apiMiddlewareOptions,
  createApiMiddleware,
} from '../../middleware/api';
import { GlobalYargs } from '../../types';

/* -----------------------------------------------------------------------------
 * aliasSetCommand
 * ---------------------------------------------------------------------------*/

type AliasSetCommandOptions = {
  /**
   * ApiService to use.
   */
  apiService: ApiService;
  /**
   * DeploymentId
   */
  deploymentId: string;
};

/**
 * Prints the latest 25 deployments to the console.
 */
async function aliasSetCommand({
  apiService,
  deploymentId,
}: AliasSetCommandOptions) {
  const items = await apiService.listAliases(deploymentId);
  console.table(items);
}

/* -----------------------------------------------------------------------------
 * createAliasSetCommand
 * ---------------------------------------------------------------------------*/

type AliasSetCommandArguments = {
  deploymentId: string;
} & ApiMiddlewareArguments;

function createAliasSetCommand(yargs: GlobalYargs<AliasSetCommandArguments>) {
  yargs.command(
    'set <custom-domain> <target>',
    'Links an alias to a deployment or another alias.',
    (yargs) => {
      yargs.options(apiMiddlewareOptions);
      yargs
        .positional('custom-domain', {
          describe: 'Domain of the alias',
          type: 'string',
        })
        .positional('target', {
          describe: 'Target of the alias',
          type: 'string',
        });
    },
    async ({ apiService, deploymentId }: AliasSetCommandArguments) => {
      await aliasSetCommand({
        apiService,
        deploymentId,
      });
    },
    createApiMiddleware()
  );
}

export { createAliasSetCommand };
