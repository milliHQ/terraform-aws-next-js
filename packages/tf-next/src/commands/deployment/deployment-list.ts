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
  const { apiService, output } = client;
  output.spinner('Requesting deployments from API');
  const items = await apiService.listDeployments();
  output.stopSpinner();

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
