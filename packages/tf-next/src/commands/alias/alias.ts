import { GlobalYargs } from '../../types';
import { createAliasListCommand } from './alias-list';
import { createAliasRemoveCommand } from './alias-remove';
import { createAliasSetCommand } from './alias-set';

function createAliasCommand(yargs: GlobalYargs) {
  yargs.command(
    'alias [command]',
    'Manage aliases',
    (yargs: GlobalYargs<any>) => {
      createAliasListCommand(yargs);
      createAliasRemoveCommand(yargs);
      createAliasSetCommand(yargs);
      yargs.demandCommand();
    }
  );
}

export { createAliasCommand };
