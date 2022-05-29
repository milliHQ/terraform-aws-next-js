import { ApiService } from '../../api';
import {
  ApiMiddlewareArguments,
  apiMiddlewareOptions,
  createApiMiddleware,
} from '../../middleware/api';
import { GlobalYargs } from '../../types';

/* -----------------------------------------------------------------------------
 * aliasListCommand
 * ---------------------------------------------------------------------------*/

type AliasListCommandOptions = {
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
async function aliasListCommand({
  apiService,
  deploymentId,
}: AliasListCommandOptions) {
  const items = await apiService.listAliases(deploymentId);
  console.table(items);
}

/* -----------------------------------------------------------------------------
 * createAliasListCommand
 * ---------------------------------------------------------------------------*/

type AliasListCommandArguments = {
  deploymentId: string;
} & ApiMiddlewareArguments;

function createAliasListCommand(yargs: GlobalYargs<AliasListCommandArguments>) {
  yargs.command(
    'ls <deployment-id>',
    'List the aliases that are associated with a deployment',
    (yargs) => {
      yargs.options(apiMiddlewareOptions);
      yargs.positional('deployment-id', {
        describe: 'ID of the deployment.',
        type: 'string',
      });
    },
    async ({ apiService, deploymentId }: AliasListCommandArguments) => {
      await aliasListCommand({
        apiService,
        deploymentId,
      });
    },
    createApiMiddleware()
  );
}

export { createAliasListCommand };
