import { Client, withClient } from '../../client';
import { GlobalOptions } from '../../types';
import {
  DeploymentHasLinkedAliases,
  DeploymentNotExists,
  ResponseError,
} from '../../utils/errors';

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
  try {
    const result = await apiService.deleteDeploymentById(deploymentId);
    if (
      result &&
      (result.status === 'DESTROY_REQUESTED' ||
        result.status === 'DESTROY_IN_PROGRESS')
    ) {
      try {
        // Poll until the destruction is complete
        // When destruction is complete the polling should fail with a
        // 404 - Deployment not found
        await apiService.pollForDeploymentStatus(deploymentId, 'FINISHED');
      } catch (error: ResponseError | any) {
        if (error.code !== 'DEPLOYMENT_NOT_FOUND') {
          throw error;
        }
      }
    }

    output.success('Deployment successfully removed.');
  } catch (error: ResponseError | any) {
    switch (error.code) {
      case 'NOT_FOUND':
        throw new DeploymentNotExists(deploymentId);

      case 'ALIASES_ASSOCIATED':
        throw new DeploymentHasLinkedAliases();

      default:
        throw error;
    }
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
