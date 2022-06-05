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
    case 'CREATE_FAILED':
    case 'DESTROY_FAILED':
      return chalk.red`error`;
    case 'CREATE_IN_PROGRESS':
      return chalk.cyan`creating`;
    case 'DESTROY_IN_PROGRESS':
      return chalk.cyan`destroying`;
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

  if (deployments.length === 0) {
    output.log(
      `No deployments created yet.\n${chalk.gray(
        'Create a new deployment by running `tf-next deploy`.'
      )}`
    );
    return;
  }

  const todayMillis = Date.now();
  console.log(
    table(
      [
        // Header
        ['age ▼', 'deployment-id', 'status'].map((header) => chalk.dim(header)),
        // Data
        ...deployments.map((deployment) => [
          ms(todayMillis - new Date(deployment.createDate).getTime()),
          deployment.id,
          renderStatus(deployment.status),
        ]),
      ],
      {
        hsep: ' '.repeat(3),
        stringLength: strlen,
      }
    ).replace(/^/gm, '  ') + '\n'
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
