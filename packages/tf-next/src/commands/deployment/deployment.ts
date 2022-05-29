import { GlobalYargs } from '../../types';

import { createDeploymentListCommand } from './deployment-list';
import { createDeploymentRemoveCommand } from './deployment-remove';

function createDeploymentCommand(yargs: GlobalYargs) {
  yargs.command(
    'deployment [action]',
    'Manage deployments',
    (yargs: GlobalYargs<any>) => {
      createDeploymentListCommand(yargs);
      createDeploymentRemoveCommand(yargs);
      yargs.demandCommand();
    }
  );
}

export { createDeploymentCommand };
