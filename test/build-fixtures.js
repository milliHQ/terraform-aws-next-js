/**
 * Builds the fixtures with terraform-next-build
 */

const { readdir, stat } = require('fs').promises;
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const tmp = require('tmp');
const fs = require('fs-extra');

const DEBUG = false;
const pathToFixtures = path.join(__dirname, 'fixtures');
const yarnCommand = 'yarnpkg';
const tfNextBuildPath = path.dirname(require.resolve(`tf-next/package.json`));

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

  async function build(buildPath) {
    const command = 'node';
    const args = [tfNextBuildPath, 'build'];

    // Copy the files first in a tmp dir from where the build starts
    // This must happen in order to find the correct workspace root
    // Otherwise the script would falsely assume that the workspace root
    // of this project would be the correct workspace root
    const tmpDir = tmp.dirSync({
      unsafeCleanup: true,
    });
    const workDir = tmpDir.name;
    await fs.copy(buildPath, workDir);

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: workDir,
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
    }).then(() => {
      // Copy .next-tf directory back to the original place
      return fs.copy(
        path.join(workDir, '.next-tf'),
        path.join(buildPath, '.next-tf')
      );
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
