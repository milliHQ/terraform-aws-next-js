import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';

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
  const { apiService, output } = client;

  output.spinner(`Removing deployment ${deploymentId}`);
  const success = await apiService.deleteDeploymentById(deploymentId);
  output.stopSpinner();

  if (success) {
    output.log('Deployment successfully removed.');
  } else {
    output.log('Could not remove deployment.');
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
