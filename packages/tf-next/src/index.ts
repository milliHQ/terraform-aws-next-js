import cuid from 'cuid';
import yargs from 'yargs';

// TODO: Have a central configuration for AWS API versions

yargs
  .scriptName('tf-next')
  .usage('$0 <cmd> [args]')
  .command(
    'build',
    'Build the next.js project',
    (yargs_) => {
      return yargs_
        .option('skipDownload', {
          type: 'boolean',
          description: 'Runs the build in the current working directory',
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Run with verbose logging',
        });
    },
    async ({ skipDownload, verbose }) => {
      const cwd = process.cwd();

      (await import('./commands/build')).default({
        skipDownload,
        logLevel: verbose ? 'verbose' : 'none',
        cwd,
      });
    }
  )
  .command(
    'list-deployments',
    'List existing deployments',
    async () => {
      (await import('./commands/list-deployments')).default({});
    }
  )
  .command(
    'create-deployment',
    'Create a new deployment that runs in parallel to the existing deployments',
    (yargs_) => {
      return yargs_
        .option('verbose', {
          type: 'boolean',
          description: 'Run with verbose logging',
        });
    },
    async ({ verbose }) => {
      const cwd = process.cwd();
      const deploymentId = cuid();

      // TODO:
      // Figure out a good way to pass the current terraform state. Especially
      // considering that there could be multiple environments (preview,
      // production). For development/testing, we'll save the current state,
      // that we get when running `$ terraform show -json` into a file called
      // `terraform.config.json` at the root of this package.
      const terraformState = require('../terraform.config.json');

      (await import('./commands/create-deployment')).default({
        deploymentId,
        logLevel: verbose ? 'verbose' : 'none',
        cwd,
        terraformState,
      });
    }
  )
  .help()
  .argv;
