import cuid from 'cuid';
import yargs from 'yargs';

// TODO: Have a central configuration for AWS API versions
// TODO: Handle trying to delete a deployment that doesn't exist
// TODO: Handle trying to create a deployment with an id that already exists

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

      await (await import('./commands/create-deployment')).default({
        deploymentId,
        logLevel: verbose ? 'verbose' : 'none',
        cwd,
        terraformState,
      });

      console.log(`Created deployment ${deploymentId}.`)
    }
  )
  .command(
    'delete-deployment',
    'Delete an existing deployment',
    (yargs_) => {
      return yargs_
        .option('deploymentId', {
          type: 'string',
          description: 'The id of the deployment to delete',
          demandOption: true,
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Run with verbose logging',
        });
    },
    async ({ deploymentId, verbose }) => {
      const cwd = process.cwd();

      // TODO:
      // Figure out a good way to pass the current terraform state. Especially
      // considering that there could be multiple environments (preview,
      // production). For development/testing, we'll save the current state,
      // that we get when running `$ terraform show -json` into a file called
      // `terraform.config.json` at the root of this package.
      const terraformState = require('../terraform.config.json');

      await (await import('./commands/delete-deployment')).default({
        deploymentId,
        logLevel: verbose ? 'verbose' : 'none',
        cwd,
        terraformState,
      });

      console.log(`Deleted deployment ${deploymentId}.`)
    }
  )
  .help()
  .argv;
