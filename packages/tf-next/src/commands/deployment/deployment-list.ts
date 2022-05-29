import { ApiService } from '../../api';
import {
  ApiMiddlewareArguments,
  apiMiddlewareOptions,
  createApiMiddleware,
} from '../../middleware/api';
import { GlobalYargs } from '../../types';

/* -----------------------------------------------------------------------------
 * deploymentListCommand
 * ---------------------------------------------------------------------------*/

type DeploymentListCommandOptions = {
  /**
   * ApiService to use.
   */
  apiService: ApiService;
};

/**
 * Prints the latest 25 deployments to the console.
 */
async function deploymentListCommand({
  apiService,
}: DeploymentListCommandOptions) {
  const items = await apiService.listDeployments();
  console.table(items);
}

/* -----------------------------------------------------------------------------
 * createListDeploymentsCommand
 * ---------------------------------------------------------------------------*/

type DeploymentListCommandArguments = ApiMiddlewareArguments;

function createDeploymentListCommand(
  yargs: GlobalYargs<DeploymentListCommandArguments>
) {
  yargs.command(
    'ls',
    'List the latest deployments',
    (yargs) => {
      yargs.options(apiMiddlewareOptions);
    },
    async ({ apiService }) => {
      await deploymentListCommand({
        apiService,
      });
    },
    createApiMiddleware()
  );
}

export { createDeploymentListCommand };
