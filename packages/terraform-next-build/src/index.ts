import { build } from '@dealmore/next-tf';
import tmp from 'tmp';
import { glob, Lambda, FileFsRef, streamToBuffer } from '@vercel/build-utils';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Route } from '@vercel/routing-utils';
import archiver from 'archiver';

interface Lambdas {
  [key: string]: Lambda;
}

interface StaticWebsiteFiles {
  [key: string]: FileFsRef;
}

function getFiles(basePath: string) {
  return glob('**', {
    cwd: basePath,
    ignore: ['node_modules/**/*', '.next/**/*', '.next-tf/**/*'],
  });
}

interface OutputProps {
  routes: Route[];
  lambdas: Lambdas;
  staticWebsiteFiles: StaticWebsiteFiles;
  outputDir: string;
}

interface ConfigOutput {
  routes: Route[];
  lambdas: {
    [key: string]: {
      handler: string;
      runtime: string;
      filename: string;
    };
  };
}

function writeStaticWebsiteFiles(
  outputFile: string,
  files: StaticWebsiteFiles
) {
  return new Promise(async (resolve, reject) => {
    // Create a zip package for the static website files
    const output = fs.createWriteStream(outputFile);
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.pipe(output);

    output.on('close', function () {
      console.log(archive.pointer() + ' total bytes');
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    const appendFiles = [];

    for (const [key, file] of Object.entries(files)) {
      appendFiles.push(
        new Promise(async (resolve) => {
          const buf = await streamToBuffer(file.toStream());
          archive.append(buf, { name: key });
          console.log('RESOLVED', key);
          resolve();
        })
      );
    }

    await Promise.all(appendFiles);

    archive.finalize();
  });
}

function writeOutput(props: OutputProps) {
  const config: ConfigOutput = {
    lambdas: {},
    routes: props.routes,
  };

  for (const [key, lambda] of Object.entries(props.lambdas)) {
    const zipFilename = path.join(props.outputDir, 'lambdas', `${key}.zip`);
    fs.outputFileSync(zipFilename, lambda.zipBuffer);

    config.lambdas[key] = {
      handler: lambda.handler,
      runtime: lambda.runtime,
      filename: path.relative(props.outputDir, zipFilename),
    };
  }

  const staticFilesArchive = writeStaticWebsiteFiles(
    path.join(props.outputDir, 'static-website-files.zip'),
    props.staticWebsiteFiles
  );

  // Write config.json
  const writeConfig = fs.outputJSON(
    path.join(props.outputDir, 'config.json'),
    config,
    {
      spaces: 2,
    }
  );

  return Promise.all([writeConfig, staticFilesArchive]);
}

async function main() {
  const entryPath = process.cwd();
  const entrypoint = 'package.json';
  const workDirObj = tmp.dirSync();
  const outputDir = path.join(process.cwd(), '.next-tf');

  // Ensure that the output dir exists
  fs.ensureDirSync(outputDir);

  const files = await getFiles(entryPath);

  try {
    const lambdas: Lambdas = {};
    const staticWebsiteFiles: StaticWebsiteFiles = {};

    const buildResult = await build({
      files,
      workPath: workDirObj.name,
      entrypoint,
      config: {},
      meta: { isDev: false },
    });

    for (const [key, file] of Object.entries(buildResult.output)) {
      if (file instanceof Lambda) {
        // Filter for lambdas
        lambdas[key] = file;
      } else if (file instanceof FileFsRef) {
        // Filter for static Website content
        staticWebsiteFiles[key] = file;
      }
    }

    await writeOutput({
      routes: buildResult.routes,
      lambdas,
      staticWebsiteFiles,
      outputDir: outputDir,
    });

    console.log('hello world!', buildResult);
  } catch (err) {
    console.error(err);
  }

  // Cleanup
  fs.emptyDirSync(workDirObj.name);
  workDirObj.removeCallback();
}

main();
