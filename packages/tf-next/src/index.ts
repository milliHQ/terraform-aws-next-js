import globalYargs from 'yargs';

globalYargs
  /* ---------------------------------------------------------------------------
   * global options
   * -------------------------------------------------------------------------*/
  .option('verbose', {
    type: 'boolean',
    description: 'Run with verbose logging',
  })

  /* ---------------------------------------------------------------------------
   * Command: Build
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
   * Command: Deploy
   * -------------------------------------------------------------------------*/

  .command(
    'deploy <bucket>',
    'Deploy the build output to Terraform Next.js',
    (yargs) => {
      yargs.positional('bucket', {
        describe:
          'The S3 bucket where the deployment package should be uploaded to.',
        type: 'string',
      });
    },
    async ({ bucket, verbose }) => {
      const cwd = process.cwd();

      if (typeof bucket !== 'string') {
        console.error('Upload bucket was not provided.');
        return;
      }

      const deployCommand = (await import('./commands/deploy')).default;
      await deployCommand({
        s3BucketName: bucket,
        logLevel: verbose ? 'verbose' : 'none',
        cwd,
      });
    }
  ).argv;
