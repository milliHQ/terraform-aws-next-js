import { GlobalYargs } from '../../types';
import { createAliasListCommand } from './alias-list';

function createAliasCommand(yargs: GlobalYargs) {
  yargs.command(
    'alias [action]',
    'Manage aliases',
    (yargs: GlobalYargs<any>) => {
      createAliasListCommand(yargs);
      yargs.demandCommand();
    }
  );
}

export { createAliasCommand };
