import yargs from 'yargs';

yargs
  .command(
    'build',
    'Build the next.js project',
    (yargs_) => {
      return yargs_.option('skipDownload', {
        type: 'boolean',
        description: 'Runs the build in the current working directory',
      });
    },
    async ({ skipDownload }) => {
      (await import('./commands/build')).default({
        skipDownload,
      });
    }
  )
  .command<{ bucket: string }>(
    'sync <bucket>',
    'Syncs the static files with S3',
    () => {},
    async ({ bucket }) => {
      (await import('./commands/sync')).default({ Bucket: bucket });
    }
  ).argv;
