import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';
import { createSpinner } from '../../utils/create-spinner';

/* -----------------------------------------------------------------------------
 * deploymentRemoveCommand
 * ---------------------------------------------------------------------------*/

type DeploymentRemoveCommandOptions = {
  /**
   * Global client service.
   */
  client: Client;
  /**
   * Deployment to remove.
   */
  deploymentId: string;
};

/**
 * Removes a single deployment.
 */
async function deploymentRemoveCommand({
  client,
  deploymentId,
}: DeploymentRemoveCommandOptions) {
  const { apiService } = client;

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
} & GlobalOptions;

const createDeploymentRemoveCommand =
  withClient<DeploymentRemoveCommandArguments>(
    'rm <deployment-id>',
    'Remove a deployment',
    (yargs) => {
      yargs.positional('deployment-id', {
        describe: 'ID of the deployment that should be removed.',
        type: 'string',
      });
    },
    async ({ client, deploymentId }) => {
      await deploymentRemoveCommand({
        client,
        deploymentId,
      });
    }
  );

export { createDeploymentRemoveCommand };
