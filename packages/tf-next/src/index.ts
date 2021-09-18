import cuid from 'cuid';
import * as fs from 'fs-extra';
import * as path from 'path';
import yargs from 'yargs';

// TODO: Handle trying to delete a deployment that doesn't exist
// TODO: Handle trying to create a deployment with an id that already exists
// TODO: What's a good way to get the aws region except for having to set it as env variable?

yargs
  .scriptName('tf-next')
  .usage('$0 <cmd> [args]')
  .command(
    'build',
    'Build the next.js project',
    (yargs_) => {
      return yargs_
        .option('multipleDeployments', {
          type: 'boolean',
          description: 'Runs the build with a deployment id',
        })
        .option('skipDownload', {
          type: 'boolean',
          description: 'Runs the build in the current working directory',
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Run with verbose logging',
        });
    },
    async ({ multipleDeployments, skipDownload, verbose }) => {
      const cwd = process.cwd();

      (await import('./commands/build')).default({
        skipDownload,
        logLevel: verbose ? 'verbose' : 'none',
        cwd,
        deploymentId: multipleDeployments ? cuid() : undefined,
      });
    }
  )
  .command(
    'list-deployments',
    'List existing deployments',
    async () => {
      // TODO:
      // Figure out a good way to pass the current terraform state. Especially
      // considering that there could be multiple environments (preview,
      // production). For development/testing, we'll save the current state,
      // that we get when running `$ terraform show -json` into a file called
      // `terraform.config.json` at the root of this package.
      const terraformState = require('../terraform.config.json');

      (await import('./commands/list-deployments')).default({terraformState});
    }
  )
  .command(
    'delete-alias',
    'Delete an alias',
    (yargs_) => {
      return yargs_
        .option('alias', {
          type: 'string',
          description: 'The alias to delete',
          demandOption: true,
        });
    },
    async({ alias }) => {
      // TODO:
      // Figure out a good way to pass the current terraform state. Especially
      // considering that there could be multiple environments (preview,
      // production). For development/testing, we'll save the current state,
      // that we get when running `$ terraform show -json` into a file called
      // `terraform.config.json` at the root of this package.
      const terraformState = require('../terraform.config.json');

      await (await import('./commands/delete-alias')).default({
        alias,
        terraformState,
      });

      console.log(`Deleted alias ${alias}.`);

    }
  )
  .command(
    'update-alias',
    'Create or update an alias for an existing deployment',
    (yargs_) => {
      return yargs_
        .option('alias', {
          type: 'string',
          description: 'Name of the alias',
        })
        .option('deploymentId', {
          type: 'string',
          description: 'The id of the deployment to alias',
          demandOption: true,
        })
        .option('parent', {
          type: 'boolean',
          description: 'Alias to the parent domain',
          default: false,
        });
    },
    async({ alias, deploymentId, parent }) => {
      if (!alias && !parent || parent && alias) {
        throw new Error('Please specify either `parent` or `alias`.');
      }

      // TODO:
      // Figure out a good way to pass the current terraform state. Especially
      // considering that there could be multiple environments (preview,
      // production). For development/testing, we'll save the current state,
      // that we get when running `$ terraform show -json` into a file called
      // `terraform.config.json` at the root of this package.
      const terraformState = require('../terraform.config.json');

      await (await import('./commands/update-alias')).default({
        deploymentId,
        alias,
        parent,
        terraformState,
      });

      console.log(`Aliased deployment ${deploymentId} to ${parent ? 'parent domain' : alias}.`);
    }
  )
  .command(
    'create-deployment',
    'Create a new deployment that runs in parallel to the existing deployments',
    (yargs_) => {
      return yargs_
        .option('deployBucket', {
          type: 'string',
          description: 'The bucket where the deployment files are uploaded',
          demandOption: true,
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Run with verbose logging',
        });
    },
    async ({ deployBucket, verbose }) => {
      const cwd = process.cwd();
      const configFile = path.join(cwd, '.next-tf', 'config.json');
      let deploymentId = cuid();
      let deploymentArchive = 'deployment.zip';
      let staticFilesArchive = 'static-website-files.zip';

      try {
        const config = JSON.parse((await fs.readFile(configFile)).toString());
        if (config.deploymentId) {
          deploymentId = config.deploymentId;
        }
        staticFilesArchive = config.staticFilesArchive;
      } catch (err) {
        console.error(`Could not parse ${configFile}. Please run build first.`);
      }

      await (await import('./commands/create-deployment')).default({
        deploymentId,
        logLevel: verbose ? 'verbose' : 'none',
        cwd,
        deploymentArchive,
        staticFilesArchive,
        deployBucket,
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
