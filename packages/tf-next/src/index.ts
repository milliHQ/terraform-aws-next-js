import globalYargs from 'yargs';

globalYargs
  /* ---------------------------------------------------------------------------
   * global options
   * -------------------------------------------------------------------------*/
  .option('verbose', {
    type: 'boolean',
    description: 'Run with verbose logging',
  })
  .option('profile', {
    type: 'string',
    description: 'The AWS profile to use to make API calls',
  })

  /* ---------------------------------------------------------------------------
   * Command: build
   * -------------------------------------------------------------------------*/

  .command(
    'build',
    'Build the project for the Terraform Next.js environment.',
    (yargs) => {
      return yargs.option('skipDownload', {
        type: 'boolean',
        description: 'Runs the build in the current working directory',
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

  /* ---------------------------------------------------------------------------
   * Command: deploy
   * -------------------------------------------------------------------------*/

  .command(
    'deploy',
    'Deploy the build output to Terraform Next.js',
    (yargs) => {
      yargs.option('endpoint', {
        type: 'string',
        description: 'API endpoint to use.',
      });
    },
    async ({ endpoint, verbose, profile }) => {
      const cwd = process.cwd();

      if (typeof endpoint !== 'string') {
        console.error('Endpoint URL not provided.');
        return;
      }

      const deployCommand = (await import('./commands/deploy')).default;
      await deployCommand({
        apiEndpoint: endpoint,
        logLevel: verbose ? 'verbose' : 'none',
        cwd,
      });
    }
  )

  /* -----------------------------------------------------------------------------
   * Command: deployment ls
   * ---------------------------------------------------------------------------*/

  .command(
    'deployment ls',
    'List the latest deployments',
    (yargs) => {
      yargs.option('endpoint', {
        type: 'string',
        description: 'API endpoint to use.',
      });
    },
    async ({ endpoint, verbose, profile }) => {
      const cwd = process.cwd();

      if (typeof endpoint !== 'string') {
        console.error('Endpoint URL not provided.');
        return;
      }

      const listDeploymentsCommand = (await import('./commands/deployment-ls'))
        .default;
      await listDeploymentsCommand({
        apiEndpoint: endpoint,
        logLevel: verbose ? 'verbose' : 'none',
        cwd,
      });
    }
  ).argv;
