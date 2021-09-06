/**
 * Builds the fixtures with terraform-next-build
 */

const { readdir, stat } = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const tmp = require('tmp');
const fs = require('fs-extra');
const { parse: parseJSON } = require('hjson');

const DEBUG = false;
const pathToFixtures = path.join(__dirname, 'fixtures');

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

async function buildFixtures(debug = false) {
  const fixtures = (await getDirs(pathToFixtures)).map((_path) =>
    path.resolve(pathToFixtures, _path)
  );

  async function build(buildPath, workPath, buildPackage) {
    const tfNextBuildPath = path.dirname(require.resolve(buildPackage));
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

    // If `tf-next` is executed inside a monorepo, the workPath can be changed
    // to a subdirectory
    const realWorkDir = path.join(workDir, workPath);

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: realWorkDir,
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
        path.join(realWorkDir, '.next-tf'),
        path.join(buildPath, '.next-tf')
      );
    });
  }

  // Build all fixtures sequentially
  for (const fixture of fixtures) {
    console.log(`Building fixture "${fixture}"`);

    // Read probes.json
    const probesJson = parseJSON(
      fs.readFileSync(path.join(fixture, 'probes.json')).toString('utf-8')
    );

    for (const buildItem of probesJson.builds) {
      const { src, use } = buildItem;
      const workPath = path.dirname(
        path.relative(fixture, path.join(fixture, src))
      );
      await build(fixture, workPath, use);
    }
  }
}

async function main() {
  await buildFixtures(DEBUG);
}

main();
