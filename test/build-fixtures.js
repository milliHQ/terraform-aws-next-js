/**
 * Builds the fixtures with terraform-next-build
 */

const { readdir, stat } = require('fs').promises;
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const DEBUG = false;
const pathToFixtures = path.join(__dirname, 'fixtures');
const yarnCommand = 'yarnpkg';

// Get subdirs from a given path
const getDirs = async (_path) => {
  let dirs = [];
  for (const file of await readdir(_path)) {
    if ((await stat(path.join(_path, file))).isDirectory()) {
      dirs = [...dirs, file];
    }
  }
  return dirs;
};

async function buildProxy(debug = false) {
  const pathToProxy = path.join(__dirname, '../packages/proxy');
  spawnSync(yarnCommand, ['build'], {
    cwd: pathToProxy,
    stdio: debug ? 'inherit' : 'ignore',
  });
}

async function buildFixtures(debug = false) {
  const fixtures = (await getDirs(pathToFixtures)).map((_path) =>
    path.resolve(pathToFixtures, _path)
  );

  function build(buildPath) {
    const command = yarnCommand;
    const args = ['tf-next', 'build'];

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: buildPath,
        stdio: debug ? 'inherit' : 'ignore',
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject({
            command: `${command} ${args.join(' ')}`,
          });
          return;
        }
        resolve();
      });
    });
  }

  // Build all fixtures sequentially
  for (const fixture of fixtures) {
    console.log(`Building fixture "${fixture}"`);
    await build(fixture);
  }
}

async function main() {
  await buildProxy(DEBUG);
  await buildFixtures(DEBUG);
}

main();
