import tmp from 'tmp';
import { build } from '@millihq/tf-next-runtime';
import {
  glob,
  Lambda,
  FileFsRef,
  streamToBuffer,
  Prerender,
  download,
} from '@vercel/build-utils';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Route } from '@vercel/routing-utils';
import archiver from 'archiver';
import * as util from 'util';
import findWorkspaceRoot from 'find-yarn-workspace-root';

import { ConfigOutput } from '../types';
import { removeRoutesByPrefix } from '../utils/routes';
import { findEntryPoint } from '../utils';

// Config file version (For detecting incompatibility issues in Terraform)
// See: https://github.com/dealmore/terraform-aws-next-js/issues/5
const TF_NEXT_VERSION = 1;

type Lambdas = Record<string, Lambda>;
type Prerenders = Record<string, Prerender>;
type StaticWebsiteFiles = Record<string, FileFsRef>;

async function checkoutFiles(basePath: string, targetPath: string) {
  const files = await glob('**', {
    cwd: basePath,
    ignore: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.next-tf/**',
      '**/.git/**',
    ],
  });

  return download(files, targetPath);
}

interface PrerenderOutputProps {
  lambda: string;
}

interface OutputProps {
  buildId: string;
  images?: {
    domains: string[];
    sizes: number[];
  };
  routes: Route[];
  lambdas: Lambdas;
  prerenders: Record<string, PrerenderOutputProps>;
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
  return new Promise<void>(async (resolve, reject) => {
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
    staticRoutes: [],
    routes: props.routes,
    buildId: props.buildId,
    prerenders: props.prerenders,
    staticFilesArchive: 'static-website-files.zip',
    version: TF_NEXT_VERSION,
    images: props.images,
  };

  for (const [key, lambda] of Object.entries(props.lambdas)) {
    const zipFilename = path.join(props.outputDir, 'lambdas', `${key}.zip`);
    fs.outputFileSync(zipFilename, lambda.zipBuffer);
    const route = `/${key}`;

    config.lambdas[key] = {
      handler: lambda.handler,
      runtime: lambda.runtime as 'nodejs12.x' | 'nodejs14.x',
      filename: path.relative(props.outputDir, zipFilename),
      route: normalizeRoute(route),
    };
  }

  config.staticRoutes = Object.keys(props.staticWebsiteFiles)
    .filter(
      // Remove paths that are not routed from the proxy
      // - _next/static/ -> Is routed directly by CloudFront
      (fileName) => !fileName.startsWith('_next/static/')
    )
    // Add leading / to the route
    .map((path) => `/${path}`);

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
  logLevel?: 'verbose' | 'none';
  deleteBuildCache?: boolean;
  cwd: string;
  target?: 'AWS';
}

async function buildCommand({
  skipDownload = false,
  logLevel,
  deleteBuildCache = true,
  cwd,
  target = 'AWS',
}: BuildProps) {
  let buildOutput: OutputProps | null = null;
  const mode = skipDownload ? 'local' : 'download';

  // On download create a tmp dir where the files can be downloaded
  const tmpDir =
    mode === 'download'
      ? tmp.dirSync({ unsafeCleanup: deleteBuildCache })
      : null;

  const workspaceRoot = findWorkspaceRoot(cwd);
  const repoRootPath = workspaceRoot ?? cwd;
  const relativeWorkPath = path.relative(repoRootPath, cwd);
  const workPath =
    mode === 'download' ? path.join(tmpDir!.name, relativeWorkPath) : cwd;
  const outputDir = path.join(cwd, '.next-tf');

  // Ensure that the output dir exists
  fs.ensureDirSync(outputDir);

  if (mode === 'download') {
    console.log('Checking out files...');
    await checkoutFiles(repoRootPath, tmpDir!.name);
  }

  try {
    // Entrypoint is the path to the `package.json` or `next.config.js` file
    // from repoRootPath
    const entrypoint = findEntryPoint(workPath);
    const lambdas: Lambdas = {};
    const prerenders: Prerenders = {};
    const staticWebsiteFiles: StaticWebsiteFiles = {};

    const buildResult = await build({
      // files normally would contain build cache
      files: {},
      workPath,
      repoRootPath: mode === 'download' ? tmpDir!.name : repoRootPath,
      entrypoint,
      config: { sharedLambdas: true },
      meta: {
        isDev: false,
        // @ts-ignore
        skipDownload,
      },
    });

    // Get BuildId
    // TODO: Should be part of buildResult since it's already there
    const entryDirectory = path.dirname(entrypoint);
    const entryPath = path.join(workPath, entryDirectory);
    const buildId = await fs.readFile(
      path.join(entryPath, '.next', 'BUILD_ID'),
      'utf8'
    );

    for (const [key, file] of Object.entries(buildResult.output)) {
      switch (file.type) {
        case 'Lambda': {
          lambdas[key] = (file as unknown) as Lambda;
          break;
        }
        case 'Prerender': {
          prerenders[key] = (file as unknown) as Prerender;
          break;
        }
        case 'FileFsRef': {
          staticWebsiteFiles[key] = file as FileFsRef;
          break;
        }
      }
    }

    // Build the mapping for prerendered routes
    const prerenderedOutput: Record<string, PrerenderOutputProps> = {};
    for (const [key, prerender] of Object.entries(prerenders)) {
      // Find the matching the Lambda route
      const match = Object.entries(lambdas).find(([, lambda]) => {
        return lambda === prerender.lambda;
      });

      if (match) {
        const [lambdaKey] = match;
        prerenderedOutput[`/${key}`] = { lambda: lambdaKey };
      }
    }

    // Routes that are not handled by the AWS proxy module `_next/static/*` are filtered out
    // for better performance
    const optimizedRoutes =
      target === 'AWS'
        ? removeRoutesByPrefix(buildResult.routes, '_next/static/')
        : buildResult.routes;

    buildOutput = {
      buildId,
      prerenders: prerenderedOutput,
      routes: optimizedRoutes,
      lambdas,
      staticWebsiteFiles,
      outputDir: outputDir,
      images: buildResult.images,
    };
    await writeOutput(buildOutput);

    if (logLevel === 'verbose') {
      console.log(
        util.format('Routes:\n%s', JSON.stringify(optimizedRoutes, null, 2))
      );
    }

    console.log('Build successful!');
  } catch (err) {
    console.log('Build failed:');
    console.error(err);

    // If an error occurs make the task fail
    process.exitCode = 1;
  }

  // Cleanup tmpDir
  if (tmpDir && deleteBuildCache) {
    tmpDir.removeCallback();
  }

  return buildOutput;
}

export default buildCommand;
