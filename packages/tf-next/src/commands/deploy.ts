import { randomBytes } from 'crypto';
import { createReadStream } from 'fs';
import { resolve } from 'path';

import { fromIni } from '@aws-sdk/credential-provider-ini';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import ora from 'ora';

import { CommandDefaultOptions } from '../types';

/* -----------------------------------------------------------------------------
 * Utils
 * ---------------------------------------------------------------------------*/

function generateUUID(length = 8) {
  return randomBytes(length).toString('hex');
}

/**
 * Same spinner configuration as Next.js
 * @see {@link https://github.com/vercel/next.js/blob/canary/packages/next/build/spinner.ts}
 */
const dotsSpinner = {
  frames: ['.', '..', '...'],
  interval: 200,
};

function createSpinner(text: string) {
  const spinner = ora({ text, spinner: dotsSpinner });

  return spinner;
}

type DeployCommandOptions = CommandDefaultOptions & {
  /**
   * AWS profile that is used for authentication against the API.
   */
  awsProfile?: string;
  /**
   * AWS region where the bucket is located in.
   */
  awsRegion?: string;
  /**
   * Path to the deployment package that should be uploaded.
   */
  deploymentPackagePath?: string;
  /**
   * Bucket where the deployment package is uploaded to.
   */
  s3BucketName: string;
};

async function deployCommand({
  awsProfile,
  awsRegion = 'eu-central-1',
  deploymentPackagePath = '.next-tf/deployment.zip',
  s3BucketName,
  cwd,
}: DeployCommandOptions) {
  const internalDeploymentPackagePath = resolve(cwd, deploymentPackagePath);

  const s3Client = new S3Client({
    region: awsRegion,
    credentials: fromIni({
      profile: awsProfile,
    }),
  });

  const uploadCommand = new PutObjectCommand({
    Bucket: s3BucketName,
    Key: `${generateUUID()}.zip`,
    Body: createReadStream(internalDeploymentPackagePath),
  });

  const uploadSpinner = createSpinner('Uploading deployment package');

  try {
    uploadSpinner.start();
    await s3Client.send(uploadCommand);
    uploadSpinner.stopAndPersist();
    console.log('Upload complete.');
  } catch (error) {
    uploadSpinner.stopAndPersist();
    console.log('Upload failed: ', error);
  }
}

export default deployCommand;
