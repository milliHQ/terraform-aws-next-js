import yargs from 'yargs';

yargs
  .command(
    'build',
    'Build the next.js project',
    () => {},
    async () => {
      (await import('./commands/build')).default();
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
