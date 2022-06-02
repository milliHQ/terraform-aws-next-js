import chalk from 'chalk';
import ms from 'ms';
import table from 'text-table';

import { Client, withClient } from '../../client';
import { strlen } from '../../utils/strlen';

function renderStatus(status: string) {
  switch (status) {
    case 'FINISHED':
      return chalk.green`ready`;
    case 'INITIALIZED':
      return chalk.gray`init`;
  }

  return status;
}

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
  output.spinner('Fetching deployments');
  const deployments = await apiService.listDeployments();
  output.stopSpinner();

  if (!deployments) {
    return output.error('Could not fetch deployments');
  }

  const todayMillis = Date.now();
  console.log(
    table(
      [
        // Header
        ['age', 'deployment-id', 'status'].map((header) => chalk.dim(header)),
        // Data
        ...deployments.map((deployment) => [
          ms(todayMillis - new Date(deployment.createDate).getTime()),
          deployment.id,
          renderStatus(deployment.status),
        ]),
      ],
      {
        hsep: ' '.repeat(4),
        stringLength: strlen,
      }
    )
  );
}

/* -----------------------------------------------------------------------------
 * createListDeploymentsCommand
 * ---------------------------------------------------------------------------*/

const createDeploymentListCommand = withClient(
  'ls',
  'List the latest deployments',
  async () => {},
  async ({ client }) => {
    await deploymentListCommand({
      client,
    });
  }
);

export { createDeploymentListCommand };
