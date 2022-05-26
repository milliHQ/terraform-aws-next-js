import { listDeployments } from '../api/deployment/list-deployments';
import { CommandDefaultOptions } from '../types';

type listDeploymentsCommandOptions = {
  /**
   * Name of the AWS profile to use for authentication
   */
  profile?: string;
  /**
   * The api endpoint to use.
   */
  apiEndpoint: string;
} & CommandDefaultOptions;

/**
 * Prints the latest 25 deployments to the console.
 */
async function listDeploymentsCommand({
  apiEndpoint,
  profile,
}: listDeploymentsCommandOptions) {
  const items = await listDeployments({ apiEndpoint, profile });
  console.table(items);
}

export default listDeploymentsCommand;
