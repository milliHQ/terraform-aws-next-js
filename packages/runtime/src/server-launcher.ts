// The Next.js builder can emit the project in a subdirectory depending on how
// many folder levels of `node_modules` are traced. To ensure `process.cwd()`
// returns the proper path, we change the directory to the folder with the
// launcher. This mimics `yarn workspace run` behavior.
process.chdir(__dirname);

const region = process.env.VERCEL_REGION || process.env.NOW_REGION;
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = region === 'dev1' ? 'development' : 'production';
}

if (process.env.NODE_ENV !== 'production' && region !== 'dev1') {
  console.warn(
    `Warning: NODE_ENV was incorrectly set to "${process.env.NODE_ENV}", this value is being overridden to "production"`
  );
  process.env.NODE_ENV = 'production';
}

import { Server } from 'http';
// @ts-ignore - copied to the `dist` output as-is
import { Bridge } from './now__bridge';

// eslint-disable-next-line
const NextServer = require('next/dist/server/next-server.js').default;
const nextServer = new NextServer({
  // @ts-ignore __NEXT_CONFIG__ value is injected
  conf: __LAUNCHER_NEXT_CONFIG__,
  dir: '.',
  minimalMode: false, // TODO: Change to true, when proxy supports minimal mode
  customServer: false,
});
const requestHandler = nextServer.getRequestHandler();
const server = new Server(async (req, res) => {
  try {
    // entryDirectory handler
    await requestHandler(req, res);
  } catch (err) {
    console.error(err);
    // crash the lambda immediately to clean up any bad module state,
    // this was previously handled in now_bridge on an unhandled rejection
    // but we can do this quicker by triggering here
    process.exit(1);
  }
});

const bridge = new Bridge(server);
bridge.listen();
exports.launcher = bridge.launcher;
