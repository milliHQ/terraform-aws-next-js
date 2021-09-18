import { S3 } from 'aws-sdk';
import * as fs from 'fs-extra';
import * as path from 'path';

const s3 = new S3();

type LogLevel = 'verbose' | 'none' | undefined;

interface CreateDeploymentProps {
  deploymentId: string;
  logLevel: LogLevel;
  cwd: string;
  deploymentArchive: string;
  staticFilesArchive: string;
  deployBucket: string;
  target?: 'AWS';
}

function log(deploymentId: string, message: string, logLevel: LogLevel) {
  if (logLevel === 'verbose') {
    console.log(`Deployment ${deploymentId}: ${message}`);
  }
}

async function createDeploymentCommand({
  deploymentId,
  logLevel,
  cwd,
  deploymentArchive,
  staticFilesArchive,
  deployBucket,
  target = 'AWS',
}: CreateDeploymentProps) {
  // Upload deployment archive
  await s3.putObject({
    Body: (await fs.readFile(path.join(cwd, '.next-tf', deploymentArchive))),
    Bucket: deployBucket,
    Key: deploymentArchive,
  }).promise();

  log(deploymentId, 'uploaded deployment archive.', logLevel);

  // Upload static assets
  await s3.putObject({
    Body: (await fs.readFile(path.join(cwd, '.next-tf', staticFilesArchive))),
    Bucket: deployBucket,
    Key: staticFilesArchive,
  }).promise();

  log(deploymentId, 'uploaded static assets.', logLevel);
}

export default createDeploymentCommand;
