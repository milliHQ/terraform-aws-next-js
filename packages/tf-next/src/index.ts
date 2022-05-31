import globalYargs from 'yargs';

import { createMainCommand } from './commands/main';

createMainCommand(globalYargs).argv;
