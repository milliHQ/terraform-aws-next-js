import { Client, withClient } from '../../client';

/* -----------------------------------------------------------------------------
 * deploymentListCommand
 * ---------------------------------------------------------------------------*/

type DeploymentListCommandOptions = {
  /**
   * Global client service.
   */
  client: Client;
};

/**
 * Prints the latest 25 deployments to the console.
 */
async function deploymentListCommand({ client }: DeploymentListCommandOptions) {
  const { apiService } = client;

  const items = await apiService.listDeployments();
  console.table(items);
}

/* -----------------------------------------------------------------------------
 * createListDeploymentsCommand
 * ---------------------------------------------------------------------------*/

const createDeploymentListCommand = withClient(
  'ls',
  'List the latest deployments',
  () => {},
  async ({ client }) => {
    await deploymentListCommand({
      client,
    });
  }
);

export { createDeploymentListCommand };
