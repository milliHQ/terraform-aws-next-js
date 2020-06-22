import { build } from '@dealmore/next-tf';
import tmp from 'tmp';
import { glob, Lambda, FileFsRef } from '@vercel/build-utils';
import * as fs from 'fs-extra';
import * as path from 'path';

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
  lambdas: Lambdas;
  staticWebsiteFiles: StaticWebsiteFiles;
  outputDir: string;
}

interface ConfigOutput {
  lambdas: {
    [key: string]: {
      handler: string;
      runtime: string;
      filename: string;
    };
  };
}

function writeOutput(props: OutputProps) {
  const config: ConfigOutput = {
    lambdas: {},
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

  // Write config.json
  fs.outputJSONSync(path.join(props.outputDir, 'config.json'), config, {
    spaces: 2,
  });
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

    writeOutput({
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
