import { GlobalYargs } from '../../types';

import { createDeploymentListCommand } from './deployment-list';

function createDeploymentCommand(yargs: GlobalYargs) {
  createDeploymentListCommand(yargs);
}

export { createDeploymentCommand };
