import cuid from 'cuid';
import yargs from 'yargs';

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
      const id = cuid();

      (await import('./commands/create-deployment')).default({
        id,
        logLevel: verbose ? 'verbose' : 'none',
        cwd,
      });
    }
  )
  .help()
  .argv;
