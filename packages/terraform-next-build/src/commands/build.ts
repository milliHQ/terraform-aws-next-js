import { build } from '@dealmore/next-tf';
import tmp from 'tmp';
import { glob, Lambda, FileFsRef, streamToBuffer } from '@vercel/build-utils';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Route } from '@vercel/routing-utils';
import archiver from 'archiver';

import { ConfigOutput } from '../types';

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
  buildId: string;
  routes: Route[];
  lambdas: Lambdas;
  staticWebsiteFiles: StaticWebsiteFiles;
  outputDir: string;
}

function normalizeRoute(input: string) {
  return input.replace(/\/index$/, '/');
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

    for (const [key, file] of Object.entries(files)) {
      const buf = await streamToBuffer(file.toStream());
      archive.append(buf, { name: key });
    }

    archive.finalize();
  });
}

function writeOutput(props: OutputProps) {
  const config: ConfigOutput = {
    lambdas: {},
    routes: props.routes,
    buildId: props.buildId,
    staticFilesArchive: 'static-website-files.zip',
  };

  for (const [key, lambda] of Object.entries(props.lambdas)) {
    const zipFilename = path.join(props.outputDir, 'lambdas', `${key}.zip`);
    fs.outputFileSync(zipFilename, lambda.zipBuffer);
    const route = `/${key}`;

    config.lambdas[key] = {
      handler: lambda.handler,
      runtime: lambda.runtime,
      filename: path.relative(props.outputDir, zipFilename),
      route: normalizeRoute(route),
    };
  }

  const staticFilesArchive = writeStaticWebsiteFiles(
    path.join(props.outputDir, config.staticFilesArchive),
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

interface BuildProps {
  skipDownload?: boolean;
}

async function buildCommand({ skipDownload = false }: BuildProps = {}) {
  const mode = skipDownload ? 'local' : 'download';
  const cwd = process.cwd();

  // On download create a tmp dir where the files can be downloaded
  const tmpDir = mode === 'download' ? tmp.dirSync() : null;

  const entryPath = cwd;
  const entrypoint = 'package.json';
  const workPath = mode === 'download' ? tmpDir!.name : cwd;
  const outputDir = path.join(cwd, '.next-tf');

  // Ensure that the output dir exists
  fs.ensureDirSync(outputDir);

  const files = await getFiles(entryPath);

  try {
    const lambdas: Lambdas = {};
    const staticWebsiteFiles: StaticWebsiteFiles = {};

    const buildResult = await build({
      files,
      workPath,
      entrypoint,
      config: {},
      meta: {
        isDev: false,
        // @ts-ignore
        skipDownload,
      },
    });

    // Get BuildId
    const buildId = await fs.readFile(
      path.join(workPath, '.next', 'BUILD_ID'),
      'utf8'
    );

    for (const [key, file] of Object.entries(buildResult.output)) {
      if (file.type === 'Lambda') {
        // Filter for lambdas
        lambdas[key] = (file as unknown) as Lambda;
      } else if (file.type === 'FileFsRef') {
        // Filter for static Website content
        staticWebsiteFiles[key] = file as FileFsRef;
      }
    }

    await writeOutput({
      buildId,
      routes: buildResult.routes,
      lambdas,
      staticWebsiteFiles,
      outputDir: outputDir,
    });

    console.log('hello world!', buildResult);
  } catch (err) {
    console.error(err);
  }

  // Cleanup tmpDir
  if (tmpDir) {
    fs.emptyDirSync(tmpDir.name);
    tmpDir.removeCallback();
  }
}

export default buildCommand;
