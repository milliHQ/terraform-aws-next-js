import { ApiService } from '../../api';
import {
  ApiMiddlewareArguments,
  apiMiddlewareOptions,
  createApiMiddleware,
} from '../../middleware/api';
import { GlobalYargs } from '../../types';
import { createSpinner } from '../../utils/create-spinner';

/* -----------------------------------------------------------------------------
 * aliasRemoveCommand
 * ---------------------------------------------------------------------------*/

type AliasRemoveCommandOptions = {
  /**
   * ApiService to use.
   */
  apiService: ApiService;
  /**
   * The domain name of the alias.
   */
  customDomain: string;
};

/**
 * Creates a new alias or overrides an existing one.
 */
async function aliasRemoveCommand({
  apiService,
  customDomain,
}: AliasRemoveCommandOptions) {
  const spinner = createSpinner('Removing alias');
  spinner.start();
  const success = await apiService.deleteAlias(customDomain);
  spinner.stopAndPersist();

  if (success) {
    console.log('Alias was successfully removed');
  } else {
    console.log('Could not create alias');
  }
}

/* -----------------------------------------------------------------------------
 * createAliasRemoveCommand
 * ---------------------------------------------------------------------------*/

type AliasRemoveCommandArguments = {
  // Positional arguments
  customDomain: string;
} & ApiMiddlewareArguments;

function createAliasRemoveCommand(
  yargs: GlobalYargs<AliasRemoveCommandArguments>
) {
  yargs.command(
    'rm <custom-domain>',
    'Remove an existing alias',
    (yargs) => {
      yargs.positional('custom-domain', {
        describe: 'Domain of the alias',
        type: 'string',
      });
      yargs.options(apiMiddlewareOptions);
    },
    ({ apiService, customDomain }: AliasRemoveCommandArguments) =>
      aliasRemoveCommand({
        apiService,
        customDomain,
      }),
    createApiMiddleware()
  );
}

export { createAliasRemoveCommand };
