import { ApiService } from '../../api';
import {
  apiMiddlewareOptions,
  createApiMiddleware,
} from '../../middleware/api';
import { GlobalYargs } from '../../types';

/* -----------------------------------------------------------------------------
 * deploymentListCommand
 * ---------------------------------------------------------------------------*/

type listDeploymentsCommandOptions = {
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
}: listDeploymentsCommandOptions) {
  const items = await apiService.listDeployments();
  console.table(items);
}

/* -----------------------------------------------------------------------------
 * createListDeploymentsCommand
 * ---------------------------------------------------------------------------*/

function createDeploymentListCommand(yargs: GlobalYargs) {
  yargs.command(
    'deployment ls',
    'List the latest deployments',
    (yargs) => {
      yargs.options(apiMiddlewareOptions);
    },
    async ({ apiService }) => {
      await deploymentListCommand({
        apiService: apiService as ApiService,
      });
    },
    createApiMiddleware()
  );
}

export { createDeploymentListCommand };
