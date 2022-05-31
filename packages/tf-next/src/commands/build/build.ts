import * as path from 'path';
import * as util from 'util';

import { build } from '@millihq/tf-next-runtime';
import {
  glob,
  Lambda,
  FileFsRef,
  streamToBuffer,
  Prerender,
  download,
} from '@vercel/build-utils';
import { Route } from '@vercel/routing-utils';
import archiver from 'archiver';
import findWorkspaceRoot from 'find-yarn-workspace-root';
import * as fs from 'fs-extra';
import tmp from 'tmp';

import { ConfigOutput, GlobalOptions, LogLevel } from '../../types';
import { findEntryPoint } from '../../utils';
import { withClient } from '../../client';

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
    formats?: string[] | undefined;
    dangerouslyAllowSVG?: boolean | undefined;
    contentSecurityPolicy?: string | undefined;
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

/**
 * Creates a zip file from the build output with the following format:
 *
 * deployment.zip
 * ├── lambdas/
 * |   ├── lambda1.zip
 * |   └── lambda2.zip
 * ├── static/
 * |   ├── _next/...
 * |   └── prerendered-site
 * └── config.json
 */
async function writeOutput(props: OutputProps) {
  const lambdaDirPrefix = 'lambdas/';
  const staticDirPrefix = 'static/';
  const config: ConfigOutput = {
    lambdas: {},
    staticRoutes: [],
    lambdaRoutes: [],
    routes: props.routes,
    buildId: props.buildId,
    prerenders: props.prerenders,
    staticFilesArchive: 'static-website-files.zip',
    version: TF_NEXT_VERSION,
    images: props.images,
  };

  config.staticRoutes = Object.keys(props.staticWebsiteFiles)
    .map((fullFilePath) =>
      // On Windows make sure that the `\` in the filepath is replaced with `/`
      fullFilePath.split(path.sep).join(path.posix.sep)
    )
    .filter(
      // Remove paths that are not routed from the proxy
      // - _next/static/ -> Is routed directly by CloudFront
      (fullFilePath) => !fullFilePath.startsWith('_next/static/')
    )
    // Add leading / to the route
    .map((fullFilePath) => `/${fullFilePath}`);

  // Initialize zip archive
  const outputFile = fs.createWriteStream(
    path.join(props.outputDir, 'deployment.zip')
  );
  const archive = archiver('zip', {
    zlib: { level: 5 },
  });

  // Fill the archive
  await new Promise<void>(async (resolve, reject) => {
    archive.pipe(outputFile);

    outputFile.on('close', function () {
      console.log(archive.pointer() + ' total bytes');
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    // Pack lambdas
    for (const [key, lambda] of Object.entries(props.lambdas)) {
      const zipFilename = `${key}.zip`;
      const route = `/${key}`;
      config.lambdaRoutes.push(route);

      config.lambdas[key] = {
        handler: lambda.handler,
        runtime: lambda.runtime as 'nodejs12.x' | 'nodejs14.x' | 'nodejs16.x',
        filename: zipFilename,
        route: normalizeRoute(route),
      };

      archive.append(lambda.zipBuffer, {
        name: lambdaDirPrefix + zipFilename,
      });
    }

    // Pack static files
    for (const [key, file] of Object.entries(props.staticWebsiteFiles)) {
      const buf = await streamToBuffer(file.toStream());
      archive.append(buf, { name: `${staticDirPrefix}${key}` });
    }

    // Write config.json
    archive.append(JSON.stringify(config, null, 2), {
      name: 'config.json',
    });

    archive.finalize();
  });
}

/* -----------------------------------------------------------------------------
 * Build Command
 * ---------------------------------------------------------------------------*/

type BuildCommandProps = {
  skipDownload?: boolean;
  deleteBuildCache?: boolean;
  target?: 'AWS';
  logLevel: LogLevel;
  cwd: string;
};

async function buildCommand({
  skipDownload = false,
  logLevel,
  deleteBuildCache = true,
  cwd,
}: BuildCommandProps) {
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
        // @ts-ignore
        case 'Lambda': {
          lambdas[key] = file as unknown as Lambda;
          break;
        }
          // @ts-ignore
        case 'Prerender': {
          prerenders[key] = file as unknown as Prerender;
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

    buildOutput = {
      buildId,
      prerenders: prerenderedOutput,
      routes: buildResult.routes,
      lambdas,
      staticWebsiteFiles,
      outputDir: outputDir,
      images: buildResult.images,
    };
    await writeOutput(buildOutput);

    if (logLevel === 'verbose') {
      console.log(
        util.format('Routes:\n%s', JSON.stringify(buildResult.routes, null, 2))
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

/* -----------------------------------------------------------------------------
 * createBuildCommand
 * ---------------------------------------------------------------------------*/

type BuildCommandArguments = {
  skipDownload?: boolean;
} & GlobalOptions;

const createBuildCommand = withClient<BuildCommandArguments>(
  'build',
  'Build a project',
  (yargs) => {
    yargs.option('skip-download', {
      type: 'boolean',
      description: 'Runs the build in the current working directory.',
    });
  },
  async ({ commandCwd, logLevel, skipDownload }) => {
    await buildCommand({
      cwd: commandCwd,
      logLevel,
      skipDownload,
    });
  },
  {
    // No API communication needed
    withApiService: false,
  }
);

export { createBuildCommand };
