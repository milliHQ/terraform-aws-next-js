import { ApiService } from '../../api';
import {
  ApiMiddlewareArguments,
  apiMiddlewareOptions,
  createApiMiddleware,
} from '../../middleware/api';
import { GlobalYargs } from '../../types';
import { createSpinner } from '../../utils/create-spinner';

/* -----------------------------------------------------------------------------
 * deploymentRemoveCommand
 * ---------------------------------------------------------------------------*/

type DeploymentRemoveCommandOptions = {
  /**
   * ApiService to use.
   */
  apiService: ApiService;
  /**
   * Deployment to remove.
   */
  deploymentId: string;
};

/**
 * Removes a single deployment.
 */
async function deploymentRemoveCommand({
  apiService,
  deploymentId,
}: DeploymentRemoveCommandOptions) {
  const spinner = createSpinner(`Removing deployment ${deploymentId}`);
  spinner.start();
  const success = await apiService.deleteDeploymentById(deploymentId);
  spinner.stopAndPersist();

  if (success) {
    console.log('Deployment successfully removed.');
  } else {
    console.log('Could not remove deployment.');
  }
}

/* -----------------------------------------------------------------------------
 * createDeploymentRemoveCommand
 * ---------------------------------------------------------------------------*/

type DeploymentRemoveCommandArguments = {
  deploymentId: string;
} & ApiMiddlewareArguments;

function createDeploymentRemoveCommand(
  yargs: GlobalYargs<DeploymentRemoveCommandArguments>
) {
  yargs.command(
    'rm <deployment-id>',
    'Remove a deployment',
    (yargs) => {
      yargs.options(apiMiddlewareOptions);
      yargs.positional('deployment-id', {
        describe: 'ID of the deployment that should be removed.',
        type: 'string',
      });
    },
    async ({ apiService, deploymentId }) => {
      await deploymentRemoveCommand({
        apiService,
        deploymentId,
      });
    },
    createApiMiddleware()
  );
}

export { createDeploymentRemoveCommand };
