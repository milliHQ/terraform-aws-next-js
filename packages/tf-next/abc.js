const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

yargs(hideBin(process.argv))
  .middleware((ags, yargs) => {
    console.log('args', yargs.command);
    throw new Error('test');
  })
  .command(
    'serve [port]',
    'start the server',
    (yargs) => {
      return yargs.positional('port', {
        describe: 'port to bind on',
        default: 5000,
      });
    },
    (argv) => {
      if (argv.verbose) console.info(`start server on :${argv.port}`);
      serve(argv.port);
    }
  )
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
  })
  .fail(() => {
    console.log('here');
  })
  .parse();
